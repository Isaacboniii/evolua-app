'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  deleteField,
  where,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useAuth } from '@/firebase';
import { useMemoCollection, useMemoQuery } from '@/hooks/use-firebase-memo';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { firebaseConfig } from '@/firebase/config';
import { getAuthErrorMessage } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { Trash2 } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

// Senha aleatória forte só para criar a conta. O convidado nunca a usa: define a
// própria pelo email de redefinição. O sufixo garante os requisitos de complexidade.
function generateTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('') + 'Aa1!';
}

export function PanelMembersCard() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user: adminUser } = useUser();
  const { toast } = useToast();

  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersRef = useMemoCollection(firestore, 'users');
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersRef);

  // Membros não são painéis: quem tem panelOwnerId enxerga o painel de outra pessoa.
  const panels = useMemo(
    () => (users ?? []).filter((u) => u.role !== 'admin' && !u.panelOwnerId),
    [users]
  );
  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const membersQuery = useMemoQuery(
    firestore,
    selectedPanelId ? 'users' : null,
    selectedPanelId ? where('panelOwnerId', '==', selectedPanelId) : null
  );
  const { data: members } = useCollection<UserProfile>(membersQuery);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const handlePanelChange = (panelId: string) => {
    setSelectedPanelId(panelId);
    form.reset({ email: '' });
  };

  const onInvite = async (data: InviteFormData) => {
    if (!firestore || !auth || !selectedPanel || !adminUser) return;

    const email = data.email.toLowerCase().trim();

    if (email === selectedPanel.email?.toLowerCase()) {
      toast({ variant: 'destructive', title: 'Email inválido', description: 'Este email já é o dono do painel.' });
      return;
    }
    if (members?.some((m) => m.email?.toLowerCase() === email)) {
      toast({ variant: 'destructive', title: 'Usuário já é membro', description: 'Este email já tem acesso a este painel.' });
      return;
    }

    const existingUser = users?.find((u) => u.email?.toLowerCase() === email);
    if (existingUser?.role === 'admin') {
      toast({ variant: 'destructive', title: 'Email de administrador', description: 'Administradores não podem ser convidados como membros.' });
      return;
    }
    if (existingUser?.panelOwnerId && existingUser.panelOwnerId !== selectedPanel.id) {
      toast({ variant: 'destructive', title: 'Email já é membro de outro painel', description: 'Remova este usuário do painel atual antes de convidá-lo para este.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingUser) {
        // Já tem conta e perfil. Se tem dados no próprio painel, vincular os esconderia
        // — bloqueia. Perfil vazio (quem só logou uma vez) pode virar membro sem perda.
        const [txSnap, goalsSnap] = await Promise.all([
          getDocs(query(collection(firestore, `users/${existingUser.id}/transactions`), limit(1))),
          getDocs(query(collection(firestore, `users/${existingUser.id}/goals`), limit(1))),
        ]);
        if (!txSnap.empty || !goalsSnap.empty) {
          toast({ variant: 'destructive', title: 'Email possui painel próprio', description: 'Este email pertence a um usuário com dados no próprio painel e não pode ser convidado.' });
          return;
        }
        const userRef = doc(firestore, 'users', existingUser.id);
        await setDoc(userRef, { panelOwnerId: selectedPanel.id }, { merge: true });
        toast({ title: 'Membro vinculado!', description: `${email} já tinha conta e agora acessa o painel "${selectedPanel.displayName}".` });
      } else {
        // Sem conta: cria numa instância secundária do Firebase (para não deslogar o
        // admin) e dispara o email de definição de senha. O membro nasce já vinculado.
        const secondaryApp = initializeApp(firebaseConfig, `secondary-auth-${Date.now()}`);
        let createdUser = null;
        try {
          const secondaryAuth = getAuth(secondaryApp);
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email, generateTempPassword());
          createdUser = cred.user;
          const userRef = doc(firestore, 'users', createdUser.uid);
          await setDoc(userRef, {
            displayName: email.split('@')[0],
            email,
            photoURL: '',
            role: 'user',
            panelOwnerId: selectedPanel.id,
          });
          await sendPasswordResetEmail(auth, email);
          toast({ title: 'Convite enviado!', description: `Enviamos um email para ${email} definir a senha e acessar o painel.` });
        } catch (innerError) {
          // Falha após criar a conta (setDoc/reset): reverte a conta recém-criada para
          // não deixar órfã no Auth — senha aleatória que ninguém conhece e sem doc em
          // users. Sem isso, reconvidar cairia em email-already-in-use sem saída.
          if (createdUser) {
            await createdUser.delete().catch((e) => console.error('Falha ao reverter conta órfã:', e));
          }
          throw innerError;
        } finally {
          await deleteApp(secondaryApp);
        }
      }
      form.reset({ email: '' });
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
        // Conta existe no Auth mas sem doc em users (nunca logou no app) — não temos
        // o uid para vincular. Peça um login para o perfil ser criado, então reconvide.
        toast({ variant: 'destructive', title: 'Email já cadastrado', description: 'Este email já tem conta mas ainda não acessou o app. Peça para a pessoa fazer login uma vez e convide novamente.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao convidar', description: getAuthErrorMessage(error?.code) });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveConfirm = () => {
    if (!firestore || !memberToRemove) return;

    const memberRef = doc(firestore, 'users', memberToRemove.id);
    // deleteField + merge: remove só o vínculo; o doc do usuário continua existindo
    // e ele volta a ver o próprio painel.
    const updatedData = { panelOwnerId: deleteField() };
    // Captura o nome antes de fechar o dialog: o toast de sucesso é assíncrono.
    const memberName = memberToRemove.displayName || memberToRemove.email;

    setDoc(memberRef, updatedData, { merge: true })
      .then(() => {
        toast({ title: 'Membro removido', description: `${memberName} não tem mais acesso a este painel.` });
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: memberRef.path,
          operation: 'update',
          requestResourceData: { panelOwnerId: '(deleteField)' },
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ variant: 'destructive', title: 'Erro ao remover membro', description: 'Não foi possível remover o membro. Tente novamente.' });
      });

    setMemberToRemove(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros de Painel</CardTitle>
        <CardDescription>
          Convide usuários para visualizar um painel em modo somente leitura. Eles recebem
          um email para definir a senha e acessar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Painel</Label>
          <Select value={selectedPanelId} onValueChange={handlePanelChange} disabled={usersLoading}>
            <SelectTrigger>
              <SelectValue placeholder={usersLoading ? 'Carregando painéis...' : 'Selecione um painel'} />
            </SelectTrigger>
            <SelectContent>
              {panels.map((panel) => (
                <SelectItem key={panel.id} value={panel.id}>
                  {panel.displayName} ({panel.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPanel && (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Membros ativos</h3>
              {members && members.length > 0 ? (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.displayName}</p>
                        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setMemberToRemove(member)}
                      >
                        <span className="sr-only">Remover membro</span>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum membro ainda.</p>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onInvite)} className="space-y-2">
              <Label htmlFor="invite-email">Convidar por email</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="convidado@email.com"
                  disabled={isSubmitting}
                  {...form.register('email')}
                />
                <Button type="submit" className="shrink-0" disabled={isSubmitting}>
                  {isSubmitting ? 'Convidando...' : 'Convidar'}
                </Button>
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </form>
          </>
        )}
      </CardContent>

      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `${memberToRemove.displayName || memberToRemove.email} perderá o acesso a este painel e voltará a ver o próprio painel.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

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
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { useMemoCollection } from '@/hooks/use-firebase-memo';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { firebaseConfig } from '@/firebase/config';
import { getAuthErrorMessage } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';
import { Trash2, UserPlus } from 'lucide-react';

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

  const [invitingPanel, setInvitingPanel] = useState<UserProfile | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersRef = useMemoCollection(firestore, 'users');
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersRef);

  // Painéis = donos (não-admin e sem vínculo). Os membros de cada painel saem do
  // MESMO array de users já carregado — agrupar em memória evita uma query por painel.
  const panels = useMemo(
    () => (users ?? []).filter((u) => u.role !== 'admin' && !u.panelOwnerId),
    [users]
  );
  const membersByPanel = useMemo(() => {
    const map = new Map<string, UserProfile[]>();
    for (const u of users ?? []) {
      if (!u.panelOwnerId) continue;
      const list = map.get(u.panelOwnerId) ?? [];
      list.push(u);
      map.set(u.panelOwnerId, list);
    }
    return map;
  }, [users]);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const openInvite = (panel: UserProfile) => {
    form.reset({ email: '' });
    setInvitingPanel(panel);
  };

  const onInvite = async (data: InviteFormData) => {
    if (!firestore || !auth || !invitingPanel || !adminUser) return;

    const panel = invitingPanel;
    const email = data.email.toLowerCase().trim();
    const panelMembers = membersByPanel.get(panel.id) ?? [];

    if (email === panel.email?.toLowerCase()) {
      toast({ variant: 'destructive', title: 'Email inválido', description: 'Este email já é o dono do painel.' });
      return;
    }
    if (panelMembers.some((m) => m.email?.toLowerCase() === email)) {
      toast({ variant: 'destructive', title: 'Usuário já é membro', description: 'Este email já tem acesso a este painel.' });
      return;
    }

    const existingUser = users?.find((u) => u.email?.toLowerCase() === email);
    if (existingUser?.role === 'admin') {
      toast({ variant: 'destructive', title: 'Email de administrador', description: 'Administradores não podem ser convidados como membros.' });
      return;
    }
    if (existingUser?.panelOwnerId && existingUser.panelOwnerId !== panel.id) {
      toast({ variant: 'destructive', title: 'Email já é membro de outro painel', description: 'Remova este usuário do painel atual antes de convidá-lo para este.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingUser) {
        // Já tem conta e perfil (inclui quem entrou com Google). Se tem dados no próprio
        // painel, vinculá-los os esconderia — bloqueia. Perfil vazio pode virar membro.
        const [txSnap, goalsSnap] = await Promise.all([
          getDocs(query(collection(firestore, `users/${existingUser.id}/transactions`), limit(1))),
          getDocs(query(collection(firestore, `users/${existingUser.id}/goals`), limit(1))),
        ]);
        if (!txSnap.empty || !goalsSnap.empty) {
          toast({ variant: 'destructive', title: 'Email possui painel próprio', description: 'Este email pertence a um usuário com dados no próprio painel e não pode ser convidado.' });
          return;
        }
        const userRef = doc(firestore, 'users', existingUser.id);
        await setDoc(userRef, { panelOwnerId: panel.id }, { merge: true });
        toast({ title: 'Membro vinculado!', description: `${email} já tinha conta e agora acessa o painel "${panel.displayName}".` });
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
            panelOwnerId: panel.id,
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
      setInvitingPanel(null);
    } catch (error: any) {
      if (error?.code === 'auth/email-already-in-use') {
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
          Cada painel e seus usuários vinculados (somente leitura). Convidados recebem um
          email para definir a senha e acessar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {usersLoading ? (
          <p className="text-sm text-muted-foreground">Carregando painéis...</p>
        ) : panels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum painel cadastrado ainda.</p>
        ) : (
          panels.map((panel) => {
            const panelMembers = membersByPanel.get(panel.id) ?? [];
            return (
              <div key={panel.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{panel.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{panel.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    onClick={() => openInvite(panel)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Convidar
                  </Button>
                </div>
                {panelMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {panelMembers.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-2 pl-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm">{member.displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
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
                  <p className="text-xs text-muted-foreground">Nenhum membro vinculado.</p>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog
        open={!!invitingPanel}
        onOpenChange={(open) => {
          if (!open) setInvitingPanel(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar para &quot;{invitingPanel?.displayName}&quot;</DialogTitle>
            <DialogDescription>
              O convidado recebe um email para definir a senha e acessa o painel em modo
              somente leitura.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email do convidado</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="convidado@email.com"
                disabled={isSubmitting}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isSubmitting}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Convidando...' : 'Convidar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

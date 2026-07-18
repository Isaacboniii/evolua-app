'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  deleteDoc,
  deleteField,
  where,
} from 'firebase/firestore';
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
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoCollection, useMemoQuery } from '@/hooks/use-firebase-memo';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { PanelInvite, UserProfile } from '@/lib/types';
import { Trash2, X } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function PanelMembersCard() {
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const { toast } = useToast();

  const [selectedPanelId, setSelectedPanelId] = useState<string>('');
  const [memberToRemove, setMemberToRemove] = useState<UserProfile | null>(null);

  const usersRef = useMemoCollection(firestore, 'users');
  const { data: users, loading: usersLoading } = useCollection<UserProfile>(usersRef);

  // Membros não são painéis: quem tem panelOwnerId enxerga o painel de outra pessoa,
  // então não pode receber membros próprios.
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

  const invitesQuery = useMemoQuery(
    firestore,
    selectedPanelId ? 'invites' : null,
    selectedPanelId ? where('panelOwnerId', '==', selectedPanelId) : null
  );
  const { data: invites } = useCollection<PanelInvite>(invitesQuery);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const handlePanelChange = (panelId: string) => {
    setSelectedPanelId(panelId);
    form.reset({ email: '' });
  };

  const onInvite = async (data: InviteFormData) => {
    if (!firestore || !selectedPanel || !adminUser) return;

    // ID do doc de convite = email em minúsculas: as rules validam o claim
    // contra invites/{request.auth.token.email.lower()}.
    const email = data.email.toLowerCase().trim();

    if (email === selectedPanel.email?.toLowerCase()) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Este email já é o dono do painel.',
      });
      return;
    }

    if (members?.some((m) => m.email?.toLowerCase() === email)) {
      toast({
        variant: 'destructive',
        title: 'Usuário já é membro',
        description: 'Este email já tem acesso a este painel.',
      });
      return;
    }

    if (invites?.some((i) => i.id === email)) {
      toast({
        variant: 'destructive',
        title: 'Convite já enviado',
        description: 'Já existe um convite pendente para este email.',
      });
      return;
    }

    // Usuário já registrado sem vínculo: bloqueia admin sempre, e dono de painel
    // só se o painel tem DADOS — o claim esconderia essas transações/metas.
    // Perfil vazio (alguém que só logou uma vez) pode virar membro sem perda.
    const existingUser = users?.find(
      (u) => u.id !== selectedPanel.id && u.email?.toLowerCase() === email && !u.panelOwnerId
    );
    if (existingUser?.role === 'admin') {
      toast({
        variant: 'destructive',
        title: 'Email de administrador',
        description: 'Administradores não podem ser convidados como membros de painel.',
      });
      return;
    }
    if (existingUser) {
      try {
        const [txSnap, goalsSnap] = await Promise.all([
          getDocs(query(collection(firestore, `users/${existingUser.id}/transactions`), limit(1))),
          getDocs(query(collection(firestore, `users/${existingUser.id}/goals`), limit(1))),
        ]);
        if (!txSnap.empty || !goalsSnap.empty) {
          toast({
            variant: 'destructive',
            title: 'Email possui painel próprio',
            description:
              'Este email pertence a um usuário com dados no próprio painel e não pode ser convidado como membro.',
          });
          return;
        }
      } catch {
        // Falha fechada: sem conseguir validar, não cria o convite.
        toast({
          variant: 'destructive',
          title: 'Não foi possível validar o email',
          description: 'Verifique sua conexão e tente novamente.',
        });
        return;
      }
    }

    // Membro de OUTRO painel: o claim transferiria o acesso silenciosamente.
    // Exige remoção explícita do painel atual antes de convidar de novo.
    const memberElsewhere = users?.find(
      (u) => u.email?.toLowerCase() === email && u.panelOwnerId && u.panelOwnerId !== selectedPanel.id
    );
    if (memberElsewhere) {
      toast({
        variant: 'destructive',
        title: 'Email já é membro de outro painel',
        description: 'Remova este usuário do painel atual antes de convidá-lo para este.',
      });
      return;
    }

    const inviteRef = doc(firestore, 'invites', email);

    // O ID do convite é GLOBAL por email — a lista reativa acima só cobre o painel
    // selecionado. Sem esta checagem, convidar o mesmo email para outro painel
    // sobrescreveria o convite anterior em silêncio. Falha fechada: erro de
    // leitura aborta em vez de arriscar a sobrescrita que a checagem evita.
    let existingInvite;
    try {
      existingInvite = await getDoc(inviteRef);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Não foi possível validar o convite',
        description: 'Verifique sua conexão e tente novamente.',
      });
      return;
    }
    if (existingInvite.exists() && existingInvite.data().panelOwnerId !== selectedPanel.id) {
      const otherPanel = existingInvite.data().panelName;
      toast({
        variant: 'destructive',
        title: 'Convite pendente para outro painel',
        description: `${email} já foi convidado para o painel "${otherPanel ?? 'outro'}". Cancele o convite anterior antes de criar um novo.`,
      });
      return;
    }
    const inviteData = {
      panelOwnerId: selectedPanel.id,
      panelName: selectedPanel.displayName,
      invitedBy: adminUser.uid,
      createdAt: new Date().toISOString(),
    };

    setDoc(inviteRef, inviteData).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: inviteRef.path,
        operation: 'create',
        requestResourceData: inviteData,
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Erro ao convidar',
        description: 'Não foi possível criar o convite. Tente novamente.',
      });
    });

    toast({
      title: 'Convite criado!',
      description: `${email} terá acesso ao painel "${selectedPanel.displayName}" no próximo login.`,
    });
    form.reset({ email: '' });
  };

  const handleCancelInvite = (invite: PanelInvite) => {
    if (!firestore) return;

    const inviteRef = doc(firestore, 'invites', invite.id);
    deleteDoc(inviteRef).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: inviteRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar convite',
        description: 'Não foi possível remover o convite. Tente novamente.',
      });
    });

    toast({
      title: 'Convite cancelado',
      description: `O convite para ${invite.id} foi removido.`,
    });
  };

  const handleRemoveConfirm = () => {
    if (!firestore || !memberToRemove) return;

    const memberRef = doc(firestore, 'users', memberToRemove.id);
    // deleteField + merge: remove só o claim; o doc do usuário continua
    // existindo e ele volta a ver o próprio painel.
    const updatedData = { panelOwnerId: deleteField() };

    setDoc(memberRef, updatedData, { merge: true }).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: memberRef.path,
        operation: 'update',
        requestResourceData: { panelOwnerId: '(deleteField)' },
      });
      errorEmitter.emit('permission-error', permissionError);
      toast({
        variant: 'destructive',
        title: 'Erro ao remover membro',
        description: 'Não foi possível remover o membro. Tente novamente.',
      });
    });

    toast({
      title: 'Membro removido',
      description: `${memberToRemove.displayName || memberToRemove.email} não tem mais acesso a este painel.`,
    });
    setMemberToRemove(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros de Painel</CardTitle>
        <CardDescription>
          Convide usuários para visualizar um painel em modo somente leitura.
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

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Convites pendentes</h3>
              {invites && invites.length > 0 ? (
                <ul className="space-y-2">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <p className="min-w-0 truncate text-sm text-muted-foreground">{invite.id}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCancelInvite(invite)}
                      >
                        <span className="sr-only">Cancelar convite</span>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
              )}
            </div>

            <form onSubmit={form.handleSubmit(onInvite)} className="space-y-2">
              <Label htmlFor="invite-email">Convidar por email</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="convidado@email.com"
                  {...form.register('email')}
                />
                <Button type="submit" className="shrink-0">
                  Convidar
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

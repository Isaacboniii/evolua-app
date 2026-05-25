'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const inviteUserSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
});

type InviteUserFormData = z.infer<typeof inviteUserSchema>;

interface InviteUserDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: UserProfile;
}

export function InviteUserDialog({ isOpen, setIsOpen, user }: InviteUserDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
        email: ''
    }
  });

  useEffect(() => {
    if (!isOpen) {
        form.reset({ email: '' });
    }
  }, [isOpen, form]);


  const onSubmit = (data: InviteUserFormData) => {
    if (!firestore || !user) return;

    const existingShared = user.sharedWith || [];
    if (data.email === user.email || existingShared.includes(data.email)) {
        toast({
            variant: "destructive",
            title: "Usuário já tem acesso",
            description: "Este email já pertence ao dono do painel ou já foi convidado.",
        });
        return;
    }

    const userRef = doc(firestore, 'users', user.id);
    const updatedData = {
        sharedWith: [...existingShared, data.email],
    };

    setDoc(userRef, updatedData, { merge: true })
        .then(() => {
            toast({
                title: 'Convite Registrado!',
                description: `O email ${data.email} foi adicionado à lista de acesso deste painel.`,
            });
            setIsOpen(false);
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updatedData
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({
                variant: "destructive",
                title: "Erro ao convidar usuário",
                description: "Não foi possível registrar o convite. Tente novamente.",
            });
        });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar usuário para o painel "{user.displayName}"</DialogTitle>
          <DialogDescription>
            Digite o email do usuário que você deseja convidar. Eles poderão visualizar este painel assim que a funcionalidade de compartilhamento for ativada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Convidado</Label>
            <Input id="email" type="email" placeholder="convidado@email.com" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Convidando...' : 'Convidar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

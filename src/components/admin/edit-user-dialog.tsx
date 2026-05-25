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

const editUserSchema = z.object({
  displayName: z.string().min(1, { message: 'O nome do painel é obrigatório.' }),
  clientName: z.string().min(1, { message: 'O nome do cliente é obrigatório.' }),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: UserProfile;
}

export function EditUserDialog({ isOpen, setIsOpen, user }: EditUserDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (user) {
        form.reset({
            displayName: user.displayName,
            clientName: user.clientName || '',
        });
    }
  }, [user, form, isOpen]);


  const onSubmit = (data: EditUserFormData) => {
    if (!firestore || !user) return;

    const userRef = doc(firestore, 'users', user.id);
    const updatedData = {
        displayName: data.displayName,
        clientName: data.clientName,
    };

    setDoc(userRef, updatedData, { merge: true })
        .then(() => {
            toast({
                title: 'Painel Atualizado!',
                description: `O painel para ${data.displayName} foi atualizado com sucesso.`,
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
                title: "Erro ao atualizar painel",
                description: "Não foi possível atualizar as informações. Tente novamente.",
            });
        });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Painel</DialogTitle>
          <DialogDescription>
            Atualize as informações do painel do cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome do Painel</Label>
            <Input id="displayName" {...form.register('displayName')} />
            {form.formState.errors.displayName && <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>}
          </div>
           <div className="space-y-2">
            <Label htmlFor="clientName">Nome do Cliente</Label>
            <Input id="clientName" {...form.register('clientName')} />
            {form.formState.errors.clientName && <p className="text-sm text-destructive">{form.formState.errors.clientName.message}</p>}
          </div>
           <div className="space-y-2">
            <Label htmlFor="email">Email do Cliente</Label>
            <Input id="email" type="email" value={user.email} disabled />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { getAuthErrorMessage } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const createUserSchema = z.object({
  displayName: z.string().min(1, { message: 'O nome do painel é obrigatório.' }),
  clientName: z.string().min(1, { message: 'O nome do cliente é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export function CreateUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: '',
      clientName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: CreateUserFormData) => {
    if (!firestore) return;

    setIsSubmitting(true);
    const secondaryAppName = `secondary-auth-${Date.now()}`;
    // Check if app already exists
    const existingApp = getApps().find(app => app.name === secondaryAppName);
    const secondaryApp = existingApp || initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
      const newUser = userCredential.user;
      
      const userRef = doc(firestore, 'users', newUser.uid);
      const newUserProfile = {
        displayName: data.displayName,
        clientName: data.clientName,
        email: data.email,
        photoURL: '',
        role: 'user' as const,
      };

      setDoc(userRef, newUserProfile)
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'create',
                requestResourceData: newUserProfile,
            });
            errorEmitter.emit('permission-error', permissionError);
        });

      toast({
        title: 'Painel Criado!',
        description: `O painel para ${data.displayName} foi criado com sucesso.`,
      });

      form.reset();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar painel",
        description: getAuthErrorMessage(error.code),
      });
    } finally {
      setIsSubmitting(false);
      if (!existingApp) {
        await deleteApp(secondaryApp);
      }
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Criar Painel
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Painel de Cliente</DialogTitle>
          <DialogDescription>
            Isso criará uma nova conta de usuário para o cliente poder acessar o painel.
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
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <Input id="password" type="password" {...form.register('password')} />
            {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" onClick={() => form.reset()}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Painel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

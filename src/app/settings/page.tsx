'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useFirestore, useAuth, useStorage } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { AuthGate } from '@/components/auth-gate';
import { Header } from '@/components/dashboard/header';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const profileSchema = z.object({
  displayName: z.string().min(1, 'O nome de exibição é obrigatório.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, profile, loading } = useUserProfile();
  const firestore = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        displayName: profile.displayName || '',
      });
    } else if (user) {
        form.reset({
            displayName: user.displayName || '',
        });
    }
  }, [profile, user, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            variant: 'destructive',
            title: 'Arquivo muito grande',
            description: 'Por favor, selecione uma imagem menor que 5MB.',
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      e.target.value = ''; // Clear file input to allow re-selecting the same file
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !auth?.currentUser || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Não foi possível encontrar o usuário. Por favor, faça login novamente.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let newPhotoURL: string | null = null;

      if (photoFile && storage) {
        toast({ description: "Enviando foto..." });
        const storageRef = ref(storage, `profile-pictures/${user.uid}`);
        const uploadResult = await uploadBytes(storageRef, photoFile);
        newPhotoURL = await getDownloadURL(uploadResult.ref);
        toast({ description: "Foto enviada com sucesso!" });
      }

      const finalPhotoURL = newPhotoURL || profile?.photoURL || user.photoURL || '';
      const updatedProfileData = {
        displayName: data.displayName,
        photoURL: finalPhotoURL,
      };

      await updateProfile(auth.currentUser, {
        displayName: updatedProfileData.displayName,
        photoURL: updatedProfileData.photoURL,
      });

      const userDocRef = doc(firestore, 'users', user.uid);
      setDoc(userDocRef, updatedProfileData, { merge: true })
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updatedProfileData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
      
      toast({
        title: 'Perfil Atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });

      setPhotoFile(null);
      setPhotoPreview(null);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: 'Não foi possível salvar suas informações. Tente novamente.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const currentPhotoURL = photoPreview || profile?.photoURL || user?.photoURL || '';
  const fallbackInitial = profile?.displayName?.charAt(0).toUpperCase() || user?.displayName?.charAt(0).toUpperCase() || 'U';


  return (
    <AuthGate>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Configurações</h1>
          </div>
          <div className="flex flex-1 items-start justify-center rounded-lg border border-dashed shadow-sm p-4">
            <div className="w-full max-w-2xl mx-auto space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Perfil</CardTitle>
                  <CardDescription>Atualize suas informações de perfil.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="photo">Carregar Foto de Perfil (JPG, PNG, max 5MB)</Label>
                        <div className="flex items-center gap-4">
                             <Avatar className="h-20 w-20">
                                <AvatarImage src={currentPhotoURL} alt="User profile picture" />
                                <AvatarFallback>{fallbackInitial}</AvatarFallback>
                            </Avatar>
                            <Input 
                                id="photo" 
                                type="file" 
                                accept="image/jpeg, image/png" 
                                onChange={handleFileChange} 
                                className="max-w-xs" 
                                disabled={isSubmitting} 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Nome de Exibição</Label>
                      <Input 
                        id="displayName" 
                        {...form.register('displayName')} 
                        disabled={loading || isSubmitting} 
                      />
                      {form.formState.errors.displayName && (
                        <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
                      )}
                    </div>
                    
                    <Button type="submit" disabled={isSubmitting || loading}>
                      {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

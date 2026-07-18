'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';

import { useUser, useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAuthErrorMessage } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user) {
      router.push('/redirect');
    }
  }, [user, loading, router]);

  const handleSignIn = async (data: LoginFormData) => {
    if (!auth) return;
    try {
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      syncUserProfile(result.user).catch((e) => console.error("Sync error:", e));
      router.push('/redirect');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: getAuthErrorMessage(error.code),
      });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      syncUserProfile(result.user).catch((e) => console.error("Sync error:", e));
      router.push('/redirect');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Erro com Login Google",
          description: getAuthErrorMessage(error.code),
        });
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!auth) return;
    const email = loginForm.getValues('email');
    const emailCheck = z.string().email().safeParse(email);
    if (!emailCheck.success) {
      toast({
        variant: 'destructive',
        title: 'Informe seu email',
        description: 'Digite seu email no campo acima para receber o link de redefinição.',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      // user-not-found é engolido de propósito: a mensagem genérica abaixo não revela
      // se a conta existe (evita enumeração de emails). Outros erros são exibidos.
      if (error?.code !== 'auth/user-not-found') {
        toast({ variant: 'destructive', title: 'Erro', description: getAuthErrorMessage(error?.code) });
        return;
      }
    }
    toast({
      title: 'Verifique seu email',
      description: 'Se houver uma conta com esse email, enviamos um link para redefinir a senha.',
    });
  };

  // O vínculo de membro é gravado pelo admin ao convidar; aqui só criamos o perfil
  // padrão no primeiro login de quem ainda não tem doc (o dono do próprio painel).
  const syncUserProfile = async (firebaseUser: User) => {
    if (!firestore || !firebaseUser) return;
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        const newUserProfile = {
          displayName: firebaseUser.displayName || 'Novo Usuário',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || '',
          role: 'user',
        };
        await setDoc(userRef, newUserProfile);
      }
    } catch (error) {
      console.error("Error syncing user profile:", error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <Icons.logo className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Bem-vindo ao EvoluaConsults</CardTitle>
          <CardDescription>Faça login para acessar o painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={loginForm.handleSubmit(handleSignIn)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...loginForm.register('email')}
              />
              {loginForm.formState.errors.email && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pr-10"
                  {...loginForm.register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">OU CONTINUE COM</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
            <Icons.google className="mr-2 h-4 w-4" />
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
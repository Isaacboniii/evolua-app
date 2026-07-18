'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
  type User
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

import { useUser, useAuth, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Durante um login manual quem navega é o handler (após o sync/claim concluir).
  // Sem esta flag, o onAuthStateChanged popularia `user` e este effect empurraria
  // para /redirect ANTES do claim terminar — flash do painel próprio vazio.
  const isManualSignIn = useRef(false);

  useEffect(() => {
    if (!loading && user && !isManualSignIn.current) {
      router.push('/redirect');
    }
  }, [user, loading, router]);

  const handleSignIn = async (data: LoginFormData) => {
    if (!auth) return;
    isManualSignIn.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      // Aguarda o sync (que inclui o claim de convite) antes de navegar: sem isso,
      // um membro recém-convidado veria por um instante o próprio painel vazio.
      await syncUserProfile(result.user).catch((e) => console.error("Sync error:", e));
      router.push('/redirect');
    } catch (error: any) {
      isManualSignIn.current = false;
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
    isManualSignIn.current = true;
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserProfile(result.user).catch((e) => console.error("Sync error:", e));
      router.push('/redirect');
    } catch (error: any) {
      isManualSignIn.current = false;
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: "destructive",
          title: "Erro com Login Google",
          description: getAuthErrorMessage(error.code),
        });
      }
    }
  };

  const syncUserProfile = async (firebaseUser: User) => {
    if (!firestore || !firebaseUser) return;
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    // O ID do doc de convite é sempre o email em minúsculas — normaliza antes de buscar.
    const email = firebaseUser.email?.toLowerCase() ?? null;
    try {
      const docSnap = await getDoc(userRef);

      const inviteSnap = email ? await getDoc(doc(firestore, 'invites', email)) : null;
      if (inviteSnap?.exists() && !firebaseUser.emailVerified) {
        // As rules exigem email_verified para o claim (evita sequestro de convite
        // por conta registrada sem confirmar a caixa postal). Envia a verificação
        // e segue o login normal — o claim acontece no próximo login, já verificado.
        sendEmailVerification(firebaseUser).catch((e) => console.error("Verification email error:", e));
        toast({
          title: 'Confirme seu email',
          description: 'Você foi convidado para um painel. Verifique seu email e entre novamente para ativar o acesso.',
        });
      } else if (inviteSnap?.exists()) {
        const { panelOwnerId } = inviteSnap.data();
        const profilePayload = docSnap.exists()
          ? { panelOwnerId }
          : {
              displayName: firebaseUser.displayName || 'Novo Usuário',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
              panelOwnerId,
            };
        // A ordem importa: as rules validam o panelOwnerId gravado contra o convite
        // existente, então o convite só pode ser deletado após a escrita concluir.
        try {
          await setDoc(userRef, profilePayload, { merge: true });
          await deleteDoc(inviteSnap.ref);
          return;
        } catch (claimError) {
          // Claim falho (ex: convite cancelado entre a leitura e a escrita) não pode
          // impedir a criação do perfil padrão abaixo — o login segue normal.
          console.error("Claim error:", claimError);
        }
      }

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
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                {...loginForm.register('password')}
              />
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
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Durante um login/cadastro manual quem navega é o handler (após o claim concluir).
  // Sem esta flag, o onAuthStateChanged popularia `user` e o effect empurraria para
  // /redirect ANTES de o claim de convite terminar — o membro veria o painel próprio.
  const isManualAuth = useRef(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && user && !isManualAuth.current) {
      router.push('/redirect');
    }
  }, [user, loading, router]);

  // Decide a navegação após o sync. Qualquer status de bloqueio (email ainda não
  // confirmado, ou email sem acesso à plataforma fechada) desloga e mantém na tela de
  // login — não navega. Só um sync limpo (void) segue para /redirect.
  const finishAuth = async (status: 'needs-verification' | 'unauthorized' | void) => {
    if (status) {
      if (auth) await signOut(auth).catch((e) => console.error('signOut error:', e));
      isManualAuth.current = false;
      return;
    }
    router.push('/redirect');
  };

  const handleSignIn = async (data: LoginFormData) => {
    if (!auth) return;
    isManualAuth.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, data.email, data.password);
      await finishAuth(await syncUserProfile(result.user));
    } catch (error: any) {
      isManualAuth.current = false;
      toast({ variant: 'destructive', title: 'Erro de autenticação', description: getAuthErrorMessage(error.code) });
    }
  };

  const handleSignUp = async (data: LoginFormData) => {
    if (!auth) return;
    if (data.password.length < 6) {
      loginForm.setError('password', { message: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    isManualAuth.current = true;
    try {
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      await finishAuth(await syncUserProfile(result.user));
    } catch (error: any) {
      isManualAuth.current = false;
      toast({ variant: 'destructive', title: 'Erro ao criar conta', description: getAuthErrorMessage(error.code) });
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    isManualAuth.current = true;
    try {
      const result = await signInWithPopup(auth, provider);
      await finishAuth(await syncUserProfile(result.user));
    } catch (error: any) {
      isManualAuth.current = false;
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Erro com Login Google', description: getAuthErrorMessage(error.code) });
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

  // Reivindica um convite pendente (invites/{email}) no primeiro login, seja por
  // Google (email já verificado) ou por senha (após o convidado confirmar o email).
  // Plataforma FECHADA: sem convite e sem perfil já existente, o login é barrado
  // (não cria conta). Retorna 'needs-verification' quando há convite mas o email
  // ainda não foi confirmado, e 'unauthorized' quando não há acesso — em ambos o
  // chamador desloga e mantém no login.
  const syncUserProfile = async (firebaseUser: User): Promise<'needs-verification' | 'unauthorized' | void> => {
    if (!firestore || !firebaseUser) return;
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const email = firebaseUser.email?.toLowerCase() ?? null;
    const fallbackName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Novo Usuário';
    try {
      const docSnap = await getDoc(userRef);
      const inviteSnap = email ? await getDoc(doc(firestore, 'invites', email)) : null;

      if (inviteSnap?.exists() && !firebaseUser.emailVerified) {
        // As rules exigem email verificado para o claim (evita sequestro de convite
        // por conta de senha não confirmada). Envia a verificação e sinaliza que o
        // chamador deve deslogar — o claim ocorre no próximo login, já verificado.
        sendEmailVerification(firebaseUser).catch((e) => console.error('Verification email error:', e));
        toast({
          title: 'Confirme seu email',
          description: 'Você foi convidado para um painel. Confirme seu email e entre novamente para ativar o acesso.',
        });
        return 'needs-verification';
      }

      if (inviteSnap?.exists()) {
        const { panelOwnerId } = inviteSnap.data();
        const profilePayload = docSnap.exists()
          ? { panelOwnerId }
          : {
              displayName: fallbackName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              role: 'user',
              panelOwnerId,
            };
        try {
          // Grava o vínculo (as rules validam contra o convite existente).
          await setDoc(userRef, profilePayload, { merge: true });
          // Limpa o convite em fire-and-forget: se falhar, o convite órfão é
          // reivindicado/apagado no próximo login (idempotente). O importante — o
          // vínculo — já foi gravado, então retornamos de qualquer forma.
          deleteDoc(inviteSnap.ref).catch((e) => console.error('Cleanup do convite falhou:', e));
          return;
        } catch (claimError) {
          // Só chega aqui se o próprio vínculo falhou (ex: convite cancelado no meio).
          // O login segue normal e cai no perfil padrão abaixo.
          console.error('Claim error:', claimError);
        }
      }

      // Sem convite. Se já existe perfil (cliente criado pelo admin, ou membro já
      // ativo), o login segue normal. Se NÃO existe, é um acesso avulso não
      // autorizado — a plataforma é fechada, então bloqueia, reverte a conta de
      // auth recém-criada (para não deixar conta órfã nem reservar o email) e mantém
      // no login. As rules também negam o create do doc (defesa em profundidade).
      if (!docSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Acesso não autorizado',
          description: 'Este email não tem acesso. Peça um convite ao administrador.',
        });
        await firebaseUser.delete().catch((e) => console.error('Rollback da conta falhou:', e));
        return 'unauthorized';
      }
    } catch (error) {
      // Erro inesperado (ex.: getDoc falhou por rede). NÃO navega — falha fechado:
      // bloqueia e pede retry. Não apaga a conta aqui: o erro é transitório e o
      // usuário pode ser legítimo (diferente do bloqueio determinístico acima).
      console.error('Error syncing user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: 'Não foi possível validar seu acesso agora. Tente novamente.',
      });
      return 'unauthorized';
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

  const isSignup = mode === 'signup';

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 md:p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center justify-center">
            <Icons.logo className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isSignup ? 'Criar conta' : 'Bem-vindo ao EvoluaConsults'}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? 'Recebeu um convite? Crie sua conta com o email convidado.'
              : 'Faça login para acessar o painel.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={loginForm.handleSubmit(isSignup ? handleSignUp : handleSignIn)}
            className="space-y-4"
          >
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
                {!isSignup && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
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
              {isSignup && (
                <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
              )}
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
              {loginForm.formState.isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : isSignup ? (
                'Criar conta'
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            {isSignup ? (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Já tem conta? Entrar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Não tem conta? Criar conta
              </button>
            )}
          </div>

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
            {isSignup ? 'Criar conta com Google' : 'Entrar com Google'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

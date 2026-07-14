'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ShieldCheck, Mail, KeyRound, Lock } from 'lucide-react';

import { useAuth, useUser } from '@/firebase';
import { SectorShell } from './sector-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAuthErrorMessage } from '@/lib/utils';

const providerLabel = (providerId?: string) => {
  switch (providerId) {
    case 'password':
      return 'E-mail e senha';
    case 'google.com':
      return 'Conta Google';
    default:
      return providerId || 'Desconhecido';
  }
};

interface SecuritySectionProps {
  userId: string;
  isReadOnly: boolean;
  backHref: string;
}

export function SecuritySection({ isReadOnly, backHref }: SecuritySectionProps) {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const provider = user?.providerData?.[0]?.providerId;
  const canResetPassword = !isReadOnly && provider === 'password' && !!user?.email;

  const handleResetPassword = async () => {
    if (!auth || !user?.email) return;
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'E-mail enviado',
        description: `Enviamos um link de redefinição para ${user.email}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: getAuthErrorMessage(error?.code),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SectorShell
      title="Segurança"
      description="Tenha clareza e controle sobre o acesso à sua conta."
      backHref={backHref}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Dados de acesso
            </CardTitle>
            <CardDescription>Como você entra no painel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método de login</span>
              <span className="font-medium">{providerLabel(provider)}</span>
            </div>
            {user?.metadata?.creationTime && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conta criada em</span>
                <span className="font-medium">
                  {new Date(user.metadata.creationTime).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Senha
            </CardTitle>
            <CardDescription>Redefina sua senha por e-mail.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {canResetPassword ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Enviaremos um link seguro para o seu e-mail para você criar uma nova senha.
                </p>
                <Button onClick={handleResetPassword} disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
              </>
            ) : isReadOnly ? (
              <p className="text-sm text-muted-foreground">
                O gerenciamento de credenciais só está disponível para o próprio dono da conta.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você entra com {providerLabel(provider)}. A senha é gerenciada pelo próprio provedor.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[hsl(var(--chart-2))]" />
            Seus dados estão protegidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            Cada painel é privado. Suas transações e metas só podem ser lidas por você e pela
            consultoria — as regras de segurança são aplicadas no servidor, não apenas na tela.
          </p>
        </CardContent>
      </Card>
    </SectorShell>
  );
}

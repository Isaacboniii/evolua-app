'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Target,
  TrendingUp,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  LogOut,
  Settings,
} from 'lucide-react';
import { Icons } from '@/components/icons';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const sections = [
  { key: 'financas', title: 'Finanças', subtitle: 'Organize suas finanças', icon: Wallet },
  { key: 'metas', title: 'Metas', subtitle: 'Defina e acompanhe seus objetivos', icon: Target },
  { key: 'evolucao', title: 'Evolução', subtitle: 'Acompanhe sua evolução', icon: TrendingUp },
  { key: 'planilhas', title: 'Planilhas', subtitle: 'Acesse suas planilhas', icon: FileSpreadsheet },
  { key: 'relatorios', title: 'Relatórios', subtitle: 'Veja seus relatórios', icon: PieChart },
  { key: 'seguranca', title: 'Segurança', subtitle: 'Tenha clareza e segurança', icon: ShieldCheck },
] as const;

interface PanelHubProps {
  /** Prefixo das rotas das seções. Cliente: '' → /financas. Admin: /admin/dashboard/<id>. */
  basePath: string;
  /** Link opcional de "voltar" (usado pelo admin para retornar à lista de painéis). */
  backHref?: string;
  backLabel?: string;
  /** Nome do painel/cliente, exibido no herói quando o admin abre um painel. */
  panelName?: string;
}

export function PanelHub({ basePath, backHref, backLabel = 'Voltar', panelName }: PanelHubProps) {
  const auth = useAuth();
  const router = useRouter();

  const sectionHref = (key: string) => `${basePath}/${key}`;

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0f] via-[#12100c] to-[#0b0b0f] text-amber-50">
      {/* Barra superior: voltar (admin) + ações de conta */}
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-6">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm text-amber-200/70 transition-colors hover:text-amber-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-sm text-amber-200/70 transition-colors hover:text-amber-100"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-amber-200/70 transition-colors hover:text-amber-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-8">
        {/* Herói */}
        <Icons.logo className="h-11 w-11 text-amber-400" strokeWidth={1.5} />
        <p className="mt-3 text-2xl font-light tracking-[0.35em] text-amber-100">EVOLUA</p>
        <p className="text-[0.65rem] tracking-[0.5em] text-amber-400/70">CONSULTS</p>

        <h1 className="mt-8 text-center font-serif text-3xl leading-tight md:text-4xl">
          Sua jornada financeira
          <br />
          <span className="text-amber-400">começa agora.</span>
        </h1>

        {panelName && (
          <p className="mt-3 rounded-full border border-amber-400/20 px-3 py-1 text-xs text-amber-200/70">
            Painel de {panelName}
          </p>
        )}

        <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-amber-100/60">
          Mais do que números, o Evolua te ajuda a tomar decisões, alcançar metas e construir a
          vida que você deseja.
        </p>

        {/* Divisor "ACESSO RÁPIDO" */}
        <div className="mt-10 flex w-full max-w-2xl items-center gap-4">
          <span className="h-px flex-1 bg-amber-400/20" />
          <span className="text-xs tracking-[0.35em] text-amber-400/70">ACESSO RÁPIDO</span>
          <span className="h-px flex-1 bg-amber-400/20" />
        </div>

        {/* Grid de seções */}
        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ key, title, subtitle, icon: Icon }) => (
            <Link
              key={key}
              href={sectionHref(key)}
              className="group flex flex-col rounded-2xl border border-amber-400/15 bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-white/[0.06]"
            >
              <Icon className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
              <h3 className="mt-4 text-base font-semibold text-amber-50">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/50">{subtitle}</p>
              <span className="mt-5 flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/30 text-amber-400 transition-transform group-hover:translate-x-0.5">
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        {/* Rodapé */}
        <div className="mt-14 flex items-center gap-2 text-sm text-amber-200/50">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>
            Pequenas decisões mudam <span className="font-semibold text-amber-200">grandes</span>{' '}
            futuros.
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { notFound } from 'next/navigation';
import { Dashboard } from '@/components/dashboard/dashboard';
import { GoalsSection } from '@/components/sectors/goals-section';
import { EvolutionSection } from '@/components/sectors/evolution-section';
import { SpreadsheetsSection } from '@/components/sectors/spreadsheets-section';
import { ReportsSection } from '@/components/sectors/reports-section';
import { SecuritySection } from '@/components/sectors/security-section';

export type SectionKey =
  | 'financas'
  | 'metas'
  | 'evolucao'
  | 'planilhas'
  | 'relatorios'
  | 'seguranca';

interface PanelSectionRendererProps {
  section: string;
  userId: string;
  isReadOnly: boolean;
  basePath: string;
}

export function PanelSectionRenderer({
  section,
  userId,
  isReadOnly,
  basePath,
}: PanelSectionRendererProps) {
  // Voltar sempre para o hub deste painel.
  const backHref = basePath || '/';

  switch (section) {
    case 'financas':
      return <Dashboard userId={userId} backHref={backHref} />;
    case 'metas':
      return <GoalsSection userId={userId} isReadOnly={isReadOnly} backHref={backHref} />;
    case 'evolucao':
      return <EvolutionSection userId={userId} backHref={backHref} />;
    case 'planilhas':
      return <SpreadsheetsSection userId={userId} backHref={backHref} />;
    case 'relatorios':
      return <ReportsSection userId={userId} backHref={backHref} />;
    case 'seguranca':
      return <SecuritySection userId={userId} isReadOnly={isReadOnly} backHref={backHref} />;
    default:
      return notFound();
  }
}

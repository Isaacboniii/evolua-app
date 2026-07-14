'use client';

import { useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Transaction } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { SectorShell } from './sector-shell';
import { MonthPicker } from '@/components/dashboard/month-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

interface ReportsSectionProps {
  userId: string;
  backHref: string;
}

export function ReportsSection({ userId, backHref }: ReportsSectionProps) {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

  const transactionsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, `users/${userId}/transactions`));
  }, [firestore, userId]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const monthKey = format(selectedMonth, 'yyyy-MM');

  const report = useMemo(() => {
    const monthTx = (transactions || []).filter((t) => (t.date ?? '').slice(0, 7) === monthKey);

    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const byCategory = monthTx
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        share: expenses > 0 ? (amount / expenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { income, expenses, balance: income - expenses, categories, count: monthTx.length };
  }, [transactions, monthKey]);

  return (
    <SectorShell
      title="Relatórios"
      description="Resumo financeiro do período selecionado."
      backHref={backHref}
    >
      <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm capitalize text-muted-foreground">
          {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })} · {report.count} transação(ões)
        </span>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--chart-2))]">
              {formatCurrency(report.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--chart-1))]">
              {formatCurrency(report.expenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                report.balance >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-[hsl(var(--chart-1))]'
              )}
            >
              {formatCurrency(report.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Distribuição dos gastos no período.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa no período.</p>
          ) : (
            report.categories.map(({ category, amount, share }) => (
              <div key={category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{category}</span>
                  <span className="font-semibold">
                    {formatCurrency(amount)}{' '}
                    <span className="text-xs text-muted-foreground">({share.toFixed(0)}%)</span>
                  </span>
                </div>
                <Progress value={share} className="h-2" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </SectorShell>
  );
}

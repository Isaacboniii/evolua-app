'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

import type { Transaction } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { SectorShell } from './sector-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeExpenseHistoryChart } from '@/components/dashboard/income-expense-history-chart';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

interface EvolutionSectionProps {
  userId: string;
  backHref: string;
}

export function EvolutionSection({ userId, backHref }: EvolutionSectionProps) {
  const firestore = useFirestore();

  const transactionsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, `users/${userId}/transactions`));
  }, [firestore, userId]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    const paid = (transactions || []).filter((t) => t.status === 'paid');
    const totalIncome = paid.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = paid.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }, [transactions]);

  return (
    <SectorShell
      title="Evolução"
      description="Acompanhe a evolução do seu patrimônio ao longo do tempo (valores pagos)."
      backHref={backHref}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--chart-2))]">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--chart-1))]">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Acumulado</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                balance >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-[hsl(var(--chart-1))]'
              )}
            >
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <IncomeExpenseHistoryChart transactions={transactions || []} />
      </div>
    </SectorShell>
  );
}

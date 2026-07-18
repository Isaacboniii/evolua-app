'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, TrendingUp, Repeat, CreditCard, DollarSign, Wallet } from 'lucide-react';
import type { Transaction } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

// As rotas de detalhe (/income, /expenses...) operam sempre no painel do usuário
// LOGADO — para membro/admin vendo painel alheio seriam uma lista vazia editável.
// Nesses casos o card vira estático, sem link. Definido FORA do Overview para o
// React preservar a identidade do componente entre renders (evita remount dos cards).
const CardLink = ({
  href,
  isReadOnly,
  children,
}: {
  href: string;
  isReadOnly: boolean;
  children: React.ReactNode;
}) => (isReadOnly ? <>{children}</> : <Link href={href}>{children}</Link>);

export function Overview({ transactions, isReadOnly = false }: { transactions: Transaction[]; isReadOnly?: boolean }) {
  const fixedIncome = transactions
    .filter((t) => t.type === 'income' && t.incomeType === 'fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  const variableIncome = transactions
    .filter((t) => t.type === 'income' && t.incomeType === 'variable')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const paidIncome = transactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingIncome = transactions
    .filter((t) => t.type === 'income' && t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  const fixedExpenses = transactions
    .filter((t) => t.type === 'expense' && t.expenseType === 'monthly_fixed')
    .reduce((acc, t) => acc + t.amount, 0);

  const variableExpenses = transactions
    .filter((t) => t.type === 'expense' && (t.expenseType === 'single' || t.expenseType === 'installments'))
    .reduce((acc, t) => acc + t.amount, 0);
  
  const paidExpenses = transactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingExpenses = transactions
    .filter((t) => t.type === 'expense' && t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);
  
  const totalIncome = paidIncome + pendingIncome;
  const totalExpenses = paidExpenses + pendingExpenses;
  const finalBalance = totalIncome - totalExpenses;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6">
      <div className="grid gap-3 sm:gap-6">
        <CardLink isReadOnly={isReadOnly} href="/income/fixed">
          <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renda Fixa</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-2))]">{formatCurrency(fixedIncome)}</div>
              <p className="text-xs text-muted-foreground">Rendas recorrentes no mês selecionado.</p>
            </CardContent>
          </Card>
        </CardLink>
        <CardLink isReadOnly={isReadOnly} href="/income/variable">
          <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renda Variável</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-2))]">{formatCurrency(variableIncome)}</div>
              <p className="text-xs text-muted-foreground">Rendas não recorrentes no mês selecionado.</p>
            </CardContent>
          </Card>
        </CardLink>
        <CardLink isReadOnly={isReadOnly} href="/income">
            <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Renda Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div>
                  <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-2))]">{formatCurrency(paidIncome)}</div>
                  <p className="text-xs text-muted-foreground">Rendas recebidas</p>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-bold text-muted-foreground">{formatCurrency(pendingIncome)}</div>
                  <p className="text-xs text-muted-foreground">Projeção (pendentes)</p>
                </div>
            </CardContent>
            </Card>
        </CardLink>
      </div>
      <div className="grid gap-3 sm:gap-6">
        <CardLink isReadOnly={isReadOnly} href="/expenses/fixed">
          <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Fixas</CardTitle>
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-1))]">{formatCurrency(fixedExpenses)}</div>
              <p className="text-xs text-muted-foreground">Despesas recorrentes no mês selecionado.</p>
            </CardContent>
          </Card>
        </CardLink>
        <CardLink isReadOnly={isReadOnly} href="/expenses/variable">
          <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Variáveis</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-1))]">{formatCurrency(variableExpenses)}</div>
              <p className="text-xs text-muted-foreground">Despesas pontuais e parceladas no mês selecionado.</p>
            </CardContent>
          </Card>
        </CardLink>
        <CardLink isReadOnly={isReadOnly} href="/expenses">
            <Card className={cn(!isReadOnly && 'hover:bg-muted/50 transition-colors')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-xl font-bold sm:text-2xl text-[hsl(var(--chart-1))]">{formatCurrency(paidExpenses)}</div>
                <p className="text-xs text-muted-foreground">Despesas pagas</p>
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold text-muted-foreground">{formatCurrency(pendingExpenses)}</div>
                <p className="text-xs text-muted-foreground">Despesas pendentes</p>
              </div>
            </CardContent>
            </Card>
        </CardLink>
      </div>
       <Card className="col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Final Projetado</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn(
              "text-xl font-bold sm:text-2xl",
              finalBalance >= 0 ? 'text-[hsl(var(--chart-2))]' : 'text-[hsl(var(--chart-1))]'
          )}>
            {formatCurrency(finalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Balanço total considerando receitas e despesas (pagas e pendentes).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

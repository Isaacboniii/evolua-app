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

export function Overview({ transactions }: { transactions: Transaction[] }) {
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
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid gap-6">
        <Link href="/income/fixed">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renda Fixa</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--chart-2))]">{formatCurrency(fixedIncome)}</div>
              <p className="text-xs text-muted-foreground">Rendas recorrentes este mês.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/income/variable">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renda Variável</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--chart-2))]">{formatCurrency(variableIncome)}</div>
              <p className="text-xs text-muted-foreground">Rendas não recorrentes este mês.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/income">
            <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Renda Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div>
                  <div className="text-2xl font-bold text-[hsl(var(--chart-2))]">{formatCurrency(paidIncome)}</div>
                  <p className="text-xs text-muted-foreground">Rendas recebidas</p>
                </div>
                <div className="mt-2">
                  <div className="text-lg font-bold text-muted-foreground">{formatCurrency(pendingIncome)}</div>
                  <p className="text-xs text-muted-foreground">Projeção (pendentes)</p>
                </div>
            </CardContent>
            </Card>
        </Link>
      </div>
      <div className="grid gap-6">
        <Link href="/expenses/fixed">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Fixas</CardTitle>
              <Repeat className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--chart-1))]">{formatCurrency(fixedExpenses)}</div>
              <p className="text-xs text-muted-foreground">Despesas recorrentes este mês.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expenses/variable">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Variáveis</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--chart-1))]">{formatCurrency(variableExpenses)}</div>
              <p className="text-xs text-muted-foreground">Despesas pontuais e parceladas este mês.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/expenses">
            <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div>
                <div className="text-2xl font-bold text-[hsl(var(--chart-1))]">{formatCurrency(paidExpenses)}</div>
                <p className="text-xs text-muted-foreground">Despesas pagas</p>
              </div>
              <div className="mt-2">
                <div className="text-lg font-bold text-muted-foreground">{formatCurrency(pendingExpenses)}</div>
                <p className="text-xs text-muted-foreground">Despesas pendentes</p>
              </div>
            </CardContent>
            </Card>
        </Link>
      </div>
       <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Final Projetado</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn(
              "text-2xl font-bold",
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

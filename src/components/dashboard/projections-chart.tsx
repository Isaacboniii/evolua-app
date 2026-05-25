'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/types';
import { useMemo } from 'react';

const chartConfig = {
  income: {
    label: 'Renda',
    color: 'hsl(var(--chart-2))',
  },
  projected: {
    label: 'Saldo Anterior',
    color: 'hsl(var(--chart-3))',
  },
  expenses: {
    label: 'Despesas',
    color: 'hsl(var(--chart-1))',
  },
};

export function ProjectionsChart({ transactions }: { transactions: Transaction[] }) {
  const chartData = useMemo(() => {
    if (!transactions) return [];

    const data = [];
    const today = new Date();

    // Calculate initial balance from the month before the projections start
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthMonth = lastMonthDate.getMonth();
    
    let lastMonthIncome = 0;
    let lastMonthExpenses = 0;

    transactions.forEach(t => {
      const transactionDate = new Date(t.date + 'T00:00:00');
      if (transactionDate.getFullYear() === lastMonthYear && transactionDate.getMonth() === lastMonthMonth) {
        if (t.type === 'income') {
          lastMonthIncome += t.amount;
        } else {
          lastMonthExpenses += t.amount;
        }
      }
    });

    let previousMonthBalance = lastMonthIncome - lastMonthExpenses;

    const fixedIncome = transactions
      .filter(t => t.type === 'income' && t.incomeType === 'fixed')
      .reduce((sum, t) => sum + t.amount, 0);

    const fixedExpenses = transactions
      .filter(t => t.type === 'expense' && t.expenseType === 'monthly_fixed')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Loop for the next 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = date.toLocaleString('pt-BR', { month: 'short' });

      let currentMonthVariableIncome = 0;
      let currentMonthVariableExpenses = 0;

      transactions.forEach(t => {
        const transactionDate = new Date(t.date + 'T00:00:00');
        if (transactionDate.getFullYear() === year && transactionDate.getMonth() === month) {
          if (t.type === 'income' && (t.incomeType === 'variable' || t.incomeType === 'projected')) {
              currentMonthVariableIncome += t.amount;
          } else if (t.type === 'expense' && (t.expenseType === 'single' || t.expenseType === 'installments')) {
              currentMonthVariableExpenses += t.amount;
          }
        }
      });
      
      const projectedIncome = previousMonthBalance > 0 ? previousMonthBalance : 0;
      const monthIncome = fixedIncome + currentMonthVariableIncome;
      const monthExpenses = fixedExpenses + currentMonthVariableExpenses;
      
      data.push({
        month: monthName,
        income: monthIncome,
        projected: projectedIncome,
        expenses: monthExpenses,
      });
      
      previousMonthBalance = (projectedIncome + monthIncome) - monthExpenses;
    }
    return data;
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projeções Mensais</CardTitle>
        <CardDescription>Estimativa de receitas, despesas e saldo acumulado para os próximos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `R$${value / 1000}k`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
               <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="projected" fill="var(--color-projected)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
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
    label: 'Receitas',
    color: 'hsl(var(--chart-2))',
  },
  expenses: {
    label: 'Despesas',
    color: 'hsl(var(--chart-1))',
  },
};

export function IncomeExpenseHistoryChart({ transactions }: { transactions: Transaction[] }) {
  const chartData = useMemo(() => {
    if (!transactions) return [];
    
    const data: { month: string; income: number; expenses: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');

      let monthIncome = 0;
      let monthExpenses = 0;

      transactions.forEach(t => {
        const transactionDate = new Date(t.date + 'T00:00:00');
        if (transactionDate.getFullYear() === year && transactionDate.getMonth() === month && t.status === 'paid') {
          if (t.type === 'income') {
            monthIncome += t.amount;
          } else {
            monthExpenses += t.amount;
          }
        }
      });
      
      data.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        income: monthIncome,
        expenses: monthExpenses,
      });
    }
    return data;
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Receitas vs. Despesas</CardTitle>
        <CardDescription>Evolução financeira dos últimos 6 meses (transações pagas).</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickFormatter={(value) => `R$${value / 1000}k`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: "var(--color-income)",
                  stroke: "var(--color-income)",
                }}
              />
              <Line
                dataKey="expenses"
                type="monotone"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                dot={{
                    r: 4,
                    fill: "var(--color-expenses)",
                    stroke: "var(--color-expenses)",
                  }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

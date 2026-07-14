'use client';

import { useMemo } from 'react';
import { collection, query } from 'firebase/firestore';
import { Download, FileSpreadsheet } from 'lucide-react';

import type { Transaction } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { SectorShell } from './sector-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatDateForDisplay } from '@/lib/utils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

// Escapa um campo para CSV: envolve em aspas e duplica aspas internas.
const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

interface SpreadsheetsSectionProps {
  userId: string;
  backHref: string;
}

export function SpreadsheetsSection({ userId, backHref }: SpreadsheetsSectionProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const transactionsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, `users/${userId}/transactions`));
  }, [firestore, userId]);
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const rows = useMemo(
    () =>
      [...(transactions || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [transactions]
  );

  const handleExport = () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'Nada para exportar', description: 'Não há transações.' });
      return;
    }

    const header = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor'];
    // Separador ";" e BOM (﻿) para o Excel pt-BR abrir com acentos e colunas certas.
    const lines = rows.map((t) =>
      [
        csvCell(t.date),
        csvCell(t.description),
        csvCell(t.category),
        csvCell(t.type === 'income' ? 'Receita' : 'Despesa'),
        csvCell(t.status === 'paid' ? 'Pago' : 'Pendente'),
        csvCell(t.amount.toFixed(2).replace('.', ',')),
      ].join(';')
    );
    const csv = '﻿' + [header.map(csvCell).join(';'), ...lines].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Planilha gerada', description: `${rows.length} transações exportadas.` });
  };

  return (
    <SectorShell
      title="Planilhas"
      description="Exporte suas transações para abrir no Excel ou Google Sheets."
      backHref={backHref}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription>{rows.length} registro(s) disponível(is).</CardDescription>
            </div>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Exportar CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Nenhuma transação registrada.
                  </TableCell>
                </TableRow>
              ) : (
                rows.slice(0, 50).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{formatDateForDisplay(t.date)}</TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell className="hidden sm:table-cell">{t.category}</TableCell>
                    <TableCell
                      className={
                        t.type === 'income'
                          ? 'text-right font-medium text-[hsl(var(--chart-2))]'
                          : 'text-right font-medium'
                      }
                    >
                      {t.type === 'income' ? '' : '-'}
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {rows.length > 50 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Mostrando as 50 mais recentes. O CSV exporta todas as {rows.length}.
            </p>
          )}
        </CardContent>
      </Card>
    </SectorShell>
  );
}

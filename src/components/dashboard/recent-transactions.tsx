'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Transaction, Category } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { cn, formatDateForDisplay } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  category: z.string().min(1, 'A categoria é obrigatória'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  status: z.enum(['paid', 'pending']),
  incomeType: z.enum(['fixed', 'variable', 'projected']).optional(),
  expenseType: z.enum(['single', 'monthly_fixed', 'installments']).optional(),
  installments: z.object({
    current: z.coerce.number().min(1, 'Parcela atual inválida').optional(),
    total: z.coerce.number().min(1, 'Total de parcelas inválido').optional(),
  }).optional(),
}).refine(data => {
    if (data.type === 'expense' && data.expenseType === 'installments') {
        return !!data.installments && !!data.installments.current && !!data.installments.total && data.installments.current <= data.installments.total;
    }
    return true;
}, {
    message: "A parcela atual não pode ser maior que o total de parcelas.",
    path: ["installments", "current"],
});


type TransactionFormData = z.infer<typeof transactionSchema>;

export function RecentTransactions({ transactions, categories, onAddTransaction, loading, isReadOnly = false }: { transactions: Transaction[]; categories: Category[]; onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void; loading: boolean, isReadOnly?: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { control, handleSubmit, register, reset, watch } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'expense', amount: 0, category: '', description: '', incomeType: 'fixed', expenseType: 'single', status: 'paid' },
  });
  
  const transactionType = watch('type');
  const expenseType = watch('expenseType');

  const onSubmit = (data: TransactionFormData) => {
    const formData = data;

    const transactionPayload: any = {
        type: formData.type,
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        status: formData.status,
    };

    if (formData.type === 'income') {
        transactionPayload.incomeType = formData.incomeType || 'fixed';
    } else { // 'expense'
        transactionPayload.expenseType = formData.expenseType || 'single';
        if (formData.expenseType === 'installments' && formData.installments) {
            transactionPayload.installments = formData.installments;
        }
    }

    onAddTransaction(transactionPayload);
    toast({
      title: "Transação Adicionada",
      description: `${data.description} de ${formatCurrency(data.amount)} foi adicionada.`,
    });
    reset();
    setIsDialogOpen(false);
  };

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>Uma lista de suas receitas e despesas recentes.</CardDescription>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isReadOnly && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1" onClick={() => {
                  reset({ type: 'expense', amount: 0, category: '', description: '', incomeType: 'fixed', expenseType: 'single', status: 'paid' });
                  setIsDialogOpen(true);
                }}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Adicionar Transação
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Transação</DialogTitle>
                  <DialogDescription>Preencha os detalhes de sua receita ou despesa.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Despesa</SelectItem>
                              <SelectItem value="income">Receita</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Valor</Label>
                      <Input id="amount" type="number" step="0.01" {...register('amount')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" {...register('description')} />
                  </div>
                  
                  {transactionType === 'income' && (
                    <div className="space-y-2">
                      <Label htmlFor="incomeType">Tipo de Renda</Label>
                      <Controller
                        name="incomeType"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} defaultValue="fixed">
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de renda" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixa</SelectItem>
                              <SelectItem value="variable">Variável</SelectItem>
                              <SelectItem value="projected">Projetada</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}

                  {transactionType === 'expense' && (
                      <>
                          <div className="space-y-2">
                              <Label htmlFor="expenseType">Tipo de Despesa</Label>
                              <Controller
                                  name="expenseType"
                                  control={control}
                                  render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value} defaultValue="single">
                                      <SelectTrigger>
                                          <SelectValue placeholder="Selecione o tipo de despesa" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="single">Única</SelectItem>
                                          <SelectItem value="monthly_fixed">Fixa Mensal</SelectItem>
                                          <SelectItem value="installments">Parcelada</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  )}
                              />
                          </div>
                          {expenseType === 'installments' && (
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="installments.current">Parcela Atual</Label>
                                      <Input id="installments.current" type="number" {...register('installments.current')} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="installments.total">Total de Parcelas</Label>
                                      <Input id="installments.total" type="number" {...register('installments.total')} />
                                  </div>
                              </div>
                          )}
                      </>
                  )}

                  <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value} defaultValue="paid">
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="paid">Pago</SelectItem>
                                  <SelectItem value="pending">Pendente</SelectItem>
                              </SelectContent>
                          </Select>
                          )}
                      />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Adicionar Transação</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 float-right" /></TableCell>
                </TableRow>
              ))
            ) : sortedTransactions.slice(0, 5).map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {formatDateForDisplay(transaction.date)}
                    {transaction.expenseType === 'installments' && transaction.installments && (
                        <span className="ml-2">({transaction.installments.current}/{transaction.installments.total})</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge className="text-xs" variant={transaction.type === 'income' ? 'secondary' : 'destructive'}>
                    {transaction.type === 'income' ? 'receita' : 'despesa'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {transaction.status && (
                    <Badge
                      variant="outline"
                      className={cn({
                        'border-[hsl(var(--chart-2))] text-[hsl(var(--chart-2))]': transaction.status === 'paid',
                        'border-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))]': transaction.status === 'pending',
                      })}
                    >
                      {transaction.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{transaction.category}</TableCell>
                <TableCell className={cn("text-right font-medium", transaction.type === 'income' ? 'text-[hsl(var(--chart-2))]' : '')}>
                  {transaction.type === 'income' && transaction.incomeType === 'projected' ? '(P) ' : ''}
                  {transaction.type === 'income' ? '' : '-'}
                  {formatCurrency(transaction.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

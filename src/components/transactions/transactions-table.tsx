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
import { PlusCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { cn, formatDateForDisplay } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const transactionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  category: z.string().min(1, 'A categoria é obrigatória'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  date: z.string().optional(),
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

interface TransactionsTableProps {
    // Dono do painel onde as transações são gravadas. Para o dono é o próprio uid;
    // para um membro-editor é o uid do dono — por isso NÃO se usa o uid logado aqui.
    // Opcional porque o hook o resolve como string|undefined; as escritas têm guard.
    targetUserId?: string;
    initialTransactions: Transaction[];
    categories: Category[];
    transactionType?: 'income' | 'expense';
    incomeType?: 'fixed' | 'variable' | 'projected';
    expenseType?: 'single' | 'monthly_fixed' | 'installments';
    title?: string;
    description?: string;
    isReadOnly?: boolean;
}

export function TransactionsTable({ targetUserId, initialTransactions, categories, transactionType, incomeType: preselectedIncomeType, expenseType: preselectedExpenseType, title, description, isReadOnly = false }: TransactionsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [transactionIdToDelete, setTransactionIdToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const firestore = useFirestore();

  const { control, handleSubmit, register, reset, watch } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: transactionType || 'expense', amount: 0, category: '', description: '', incomeType: 'fixed', expenseType: 'single', status: 'paid' },
  });
  
  const currentTransactionType = watch('type');
  const expenseType = watch('expenseType');

  const openDialogForNew = () => {
    reset({ 
        type: transactionType || 'expense', 
        amount: 0, 
        category: '', 
        description: '', 
        date: new Date().toISOString().split('T')[0], 
        incomeType: preselectedIncomeType || 'fixed', 
        expenseType: preselectedExpenseType || 'single', 
        status: 'paid' 
    });
    setEditingTransaction(null);
    setIsDialogOpen(true);
  }

  const openDialogForEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    reset({
        ...transaction,
        status: transaction.status || 'paid',
    });
    setIsDialogOpen(true);
  }

  const onSubmit = (data: TransactionFormData) => {
    if (!firestore || !targetUserId) return;

    const { id, ...formData } = data;

    const transactionPayload: any = {
        type: formData.type,
        amount: formData.amount,
        category: formData.category,
        description: formData.description,
        date: formData.date || new Date().toISOString().split('T')[0],
        status: formData.status,
    };

    if (formData.type === 'income') {
        transactionPayload.incomeType = preselectedIncomeType || formData.incomeType || 'fixed';
    } else { // 'expense'
        transactionPayload.expenseType = preselectedExpenseType || formData.expenseType || 'single';
        if (formData.expenseType === 'installments' && formData.installments) {
            transactionPayload.installments = formData.installments;
        }
    }
    
    if (editingTransaction) {
        const docRef = doc(firestore, `users/${targetUserId}/transactions`, editingTransaction.id);
        setDoc(docRef, transactionPayload, { merge: true })
            .then(() => {
                toast({
                    title: "Transação Atualizada",
                    description: `${data.description} foi atualizada.`,
                });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: docRef.path,
                  operation: 'update',
                  requestResourceData: transactionPayload,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    } else {
        const transactionsCollection = collection(firestore, `users/${targetUserId}/transactions`);
        addDoc(transactionsCollection, transactionPayload)
            .then(() => {
                toast({
                  title: "Transação Adicionada",
                  description: `${data.description} de ${formatCurrency(data.amount)} foi adicionada.`,
                });
            })
            .catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: transactionsCollection.path,
                  operation: 'create',
                  requestResourceData: transactionPayload,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    }

    reset();
    setEditingTransaction(null);
    setIsDialogOpen(false);
  };

  const handleDelete = (transactionId: string) => {
    if (!firestore || !targetUserId) return;
    const docRef = doc(firestore, `users/${targetUserId}/transactions`, transactionId);
    deleteDoc(docRef)
        .then(() => {
            toast({
                title: "Transação Removida",
                description: `A transação foi removida com sucesso.`,
            });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  }


  const confirmDelete = (transactionId: string) => {
    setTransactionIdToDelete(transactionId);
    setShowDeleteAlert(true);
  }

  const availableCategories = categories;
  
  const addButtonText =
    transactionType === 'income'
      ? 'Adicionar Renda'
      : transactionType === 'expense'
      ? 'Adicionar Despesa'
      : 'Adicionar Transação';
  
  const dialogTitle = editingTransaction 
    ? 'Editar Transação' 
    : transactionType === 'income' 
    ? 'Adicionar Nova Renda' 
    : transactionType === 'expense' 
    ? 'Adicionar Nova Despesa' 
    : 'Adicionar Nova Transação';

  const dialogSubmitButtonText = editingTransaction 
    ? 'Salvar Alterações' 
    : addButtonText;

    const sortedTransactions = [...initialTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());


  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center">
          <div className="grid gap-2">
            <CardTitle>{title || 'Transações'}</CardTitle>
            <CardDescription>{description || 'Uma lista de suas transações.'}</CardDescription>
          </div>
          {!isReadOnly && (
            <div className="ml-auto flex items-center gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1" onClick={openDialogForNew}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      {addButtonText}
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={!!transactionType}>
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
                        <Label htmlFor="date">Data</Label>
                        <Input id="date" type="date" {...register('date')} />
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoria</Label>
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCategories.map(cat => (
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
                    
                    {currentTransactionType === 'income' && !preselectedIncomeType && (
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

                  {currentTransactionType === 'expense' && (
                      <>
                        {!preselectedExpenseType && (
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
                        )}
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
                      <Button type="submit">{dialogSubmitButtonText}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                {!transactionType && <TableHead className="hidden sm:table-cell">Tipo</TableHead>}
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
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
                  {!transactionType &&
                      <TableCell className="hidden sm:table-cell">
                      <Badge className="text-xs" variant={transaction.type === 'income' ? 'secondary' : 'destructive'}>
                          {transaction.type === 'income' ? 'receita' : 'despesa'}
                      </Badge>
                      </TableCell>
                  }
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
                  <TableCell className="text-right">
                    {!isReadOnly && (
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Abrir menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialogForEdit(transaction)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => confirmDelete(transaction.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente a transação.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionIdToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => {
                if (transactionIdToDelete) {
                    handleDelete(transactionIdToDelete);
                }
                setTransactionIdToDelete(null);
                }} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                Excluir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

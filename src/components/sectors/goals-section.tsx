'use client';

import { useMemo, useState } from 'react';
import { collection, addDoc, doc, setDoc, deleteDoc, query } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Target, PlusCircle, Edit, Trash2, MoreHorizontal } from 'lucide-react';

import type { Goal } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';
import { SectorShell } from './sector-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDateForDisplay } from '@/lib/utils';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const goalSchema = z.object({
  name: z.string().min(1, 'O nome da meta é obrigatório.'),
  targetAmount: z.coerce.number().positive('O valor alvo deve ser positivo.'),
  savedAmount: z.coerce.number().min(0, 'O valor guardado não pode ser negativo.'),
  deadline: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalsSectionProps {
  userId: string;
  isReadOnly: boolean;
  backHref: string;
}

export function GoalsSection({ userId, isReadOnly, backHref }: GoalsSectionProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const goalsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, `users/${userId}/goals`));
  }, [firestore, userId]);
  const { data: goals, loading } = useCollection<Goal>(goalsQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', targetAmount: 0, savedAmount: 0, deadline: '' },
  });

  const openForNew = () => {
    setEditingGoal(null);
    reset({ name: '', targetAmount: 0, savedAmount: 0, deadline: '' });
    setIsDialogOpen(true);
  };

  const openForEdit = (goal: Goal) => {
    setEditingGoal(goal);
    reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      deadline: goal.deadline || '',
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: GoalFormData) => {
    if (!firestore) return;

    const payload = {
      name: data.name,
      targetAmount: data.targetAmount,
      savedAmount: data.savedAmount,
      deadline: data.deadline || '',
    };

    if (editingGoal) {
      const ref = doc(firestore, `users/${userId}/goals`, editingGoal.id);
      setDoc(ref, payload, { merge: true })
        .then(() => toast({ title: 'Meta atualizada', description: `${data.name} foi atualizada.` }))
        .catch(() =>
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({ path: ref.path, operation: 'update', requestResourceData: payload })
          )
        );
    } else {
      const col = collection(firestore, `users/${userId}/goals`);
      addDoc(col, payload)
        .then(() => toast({ title: 'Meta criada', description: `${data.name} foi adicionada.` }))
        .catch(() =>
          errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({ path: col.path, operation: 'create', requestResourceData: payload })
          )
        );
    }

    setIsDialogOpen(false);
    setEditingGoal(null);
    reset();
  };

  const handleDelete = () => {
    if (!firestore || !goalToDelete) return;
    const ref = doc(firestore, `users/${userId}/goals`, goalToDelete);
    deleteDoc(ref)
      .then(() => toast({ title: 'Meta removida', description: 'A meta foi excluída.' }))
      .catch(() =>
        errorEmitter.emit(
          'permission-error',
          new FirestorePermissionError({ path: ref.path, operation: 'delete' })
        )
      )
      .finally(() => setGoalToDelete(null));
  };

  const validGoals = goals || [];

  return (
    <SectorShell
      title="Metas"
      description="Defina objetivos financeiros e acompanhe o progresso."
      backHref={backHref}
    >
      <div className="flex justify-end">
        {!isReadOnly && (
          <Button size="sm" className="h-8 gap-1" onClick={openForNew}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Nova Meta</span>
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando metas...</p>
      ) : validGoals.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <Target className="h-10 w-10" />
          <p className="text-sm">Nenhuma meta cadastrada ainda.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {validGoals.map((goal) => {
            const progress =
              goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
            return (
              <Card key={goal.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base">{goal.name}</CardTitle>
                    {goal.deadline && (
                      <CardDescription>Até {formatDateForDisplay(goal.deadline)}</CardDescription>
                    )}
                  </div>
                  {!isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Abrir menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openForEdit(goal)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setGoalToDelete(goal.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-[hsl(var(--chart-2))]">
                      {formatCurrency(goal.savedAmount)}
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-right text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            <DialogDescription>Defina um objetivo e quanto já foi guardado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Meta</Label>
              <Input id="name" placeholder="Ex: Reserva de emergência" {...register('name')} />
              {formState.errors.name && (
                <p className="text-sm text-destructive">{formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Valor Alvo</Label>
                <Input id="targetAmount" type="number" step="0.01" {...register('targetAmount')} />
                {formState.errors.targetAmount && (
                  <p className="text-sm text-destructive">{formState.errors.targetAmount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="savedAmount">Já Guardado</Label>
                <Input id="savedAmount" type="number" step="0.01" {...register('savedAmount')} />
                {formState.errors.savedAmount && (
                  <p className="text-sm text-destructive">{formState.errors.savedAmount.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo (opcional)</Label>
              <Input id="deadline" type="date" {...register('deadline')} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={formState.isSubmitting}>
                {editingGoal ? 'Salvar' : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectorShell>
  );
}

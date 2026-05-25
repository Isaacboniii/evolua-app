'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Transaction, Category } from '@/lib/types';
import { getIcon } from '@/lib/icon-map';
import { Button } from '../ui/button';
import { Settings } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ManageCategoriesDialog } from './manage-categories-dialog';
import { useUserProfile } from '@/firebase/auth/use-user-profile';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

export function CategorySpending({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const { profile } = useUserProfile();
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const getCategoryIconComponent = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    const Icon = getIcon(category?.icon);
    return <Icon className="h-4 w-4 text-muted-foreground" />;
  };

  const { categorySpending } = useMemo(() => {
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const totalSpent = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const spendingByCategory = expenseTransactions.reduce((acc, transaction) => {
      const { category, amount } = transaction;
      if (category) { // Ensure category is not null/undefined
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += amount;
      }
      return acc;
    }, {} as { [key: string]: number });

    const categorySpending = Object.entries(spendingByCategory)
      .map(([category, spent]) => ({
        category,
        spent,
        progress: totalSpent > 0 ? (spent / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.spent - a.spent);

    return { categorySpending, totalSpent };
  }, [transactions]);


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gastos por Categoria</CardTitle>
              <CardDescription>Acompanhe a distribuição dos seus gastos.</CardDescription>
            </div>
            {profile?.role === 'admin' && (
              <Button variant="ghost" size="icon" onClick={() => setIsManageCategoriesOpen(true)}>
                <Settings className="h-5 w-5" />
                <span className="sr-only">Gerenciar Categorias</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {categorySpending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
          ) : (
            categorySpending.map(({ category, spent, progress }) => {
              if (!category || spent === 0) return null;
              return (
                <div key={category}>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="font-medium flex items-center gap-2">
                      {getCategoryIconComponent(category)}
                      {category}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(spent)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
      {profile?.role === 'admin' && (
        <ManageCategoriesDialog isOpen={isManageCategoriesOpen} setIsOpen={setIsManageCategoriesOpen} />
      )}
    </>
  );
}

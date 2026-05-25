'use client'

import { Header } from "@/components/dashboard/header";
import { Overview } from "@/components/dashboard/overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { CategorySpending } from "@/components/dashboard/category-spending";
import { ProjectionsChart } from "@/components/dashboard/projections-chart";
import type { Transaction, Category } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useMemo } from 'react';
import { collection, addDoc, query } from 'firebase/firestore';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Icons } from "@/components/icons";
import { IncomeExpenseHistoryChart } from "./income-expense-history-chart";

export function Dashboard({ userId }: { userId: string }) {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { profile: viewingUserProfile } = useUserProfile();

  const isOwner = authUser?.uid === userId;

  const transactionsQuery = useMemo(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, `users/${userId}/transactions`));
  }, [firestore, userId]);
  const { data: transactions, loading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'));
  }, [firestore]);
  const { data: categoriesData, loading: categoriesLoading } = useCollection<Category>(categoriesQuery);
  const categories = categoriesData || [];

  const handleAddTransaction = (newTransactionData: Omit<Transaction, 'id' | 'date'>) => {
    if (!firestore || !userId) return;
    const transactionsCollection = collection(firestore, `users/${userId}/transactions`);
    
    const transactionPayload = {
      ...newTransactionData,
      date: new Date().toISOString().split('T')[0],
    };

    addDoc(transactionsCollection, transactionPayload)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: transactionsCollection.path,
          operation: 'create',
          requestResourceData: transactionPayload,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const validTransactions = transactions || [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center justify-center gap-2">
              <Icons.logo className="h-7 w-7 text-primary" />
              <h1 className="text-lg font-semibold md:text-2xl">EvoluaConsults</h1>
            </div>
            <div
            className="flex flex-1 rounded-lg border border-dashed shadow-sm"
            data-x-chunk="dashboard-02-chunk-1"
            >
            <div className="container mx-auto py-8">
                <div className="grid gap-6">
                    <Overview transactions={validTransactions} />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                        <RecentTransactions 
                            transactions={validTransactions} 
                            categories={categories} 
                            onAddTransaction={handleAddTransaction} 
                            loading={transactionsLoading || categoriesLoading}
                            isReadOnly={!isOwner}
                        />
                        </div>
                        <div className="space-y-6">
                          <CategorySpending transactions={validTransactions} categories={categories} />
                          <ProjectionsChart transactions={validTransactions} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <IncomeExpenseHistoryChart transactions={validTransactions} />
                    </div>
                </div>
            </div>
            </div>
        </main>
    </div>
  );
}

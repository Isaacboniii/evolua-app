'use client'

import { Header } from "@/components/dashboard/header";
import { Overview } from "@/components/dashboard/overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { CategorySpending } from "@/components/dashboard/category-spending";
import { ProjectionsChart } from "@/components/dashboard/projections-chart";
import type { Transaction, Category } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useUserProfile } from '@/firebase/auth/use-user-profile';
import { useMemo, useState } from 'react';
import { collection, addDoc, query } from 'firebase/firestore';
import { format, startOfMonth } from 'date-fns';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { IncomeExpenseHistoryChart } from "./income-expense-history-chart";
import { MonthPicker } from "./month-picker";

export function Dashboard({ userId, backHref }: { userId: string; backHref?: string }) {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { profile: viewingUserProfile } = useUserProfile();

  const isOwner = authUser?.uid === userId;

  // Mês em foco no painel. Começa no mês atual.
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

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

  // Filtro por mês feito na string "YYYY-MM" para não sofrer com fuso horário.
  const monthKey = format(selectedMonth, 'yyyy-MM');
  const monthTransactions = useMemo(
    () => validTransactions.filter((t) => (t.date ?? '').slice(0, 7) === monthKey),
    [transactions, monthKey]
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#0b0b0f] via-[#12100c] to-[#0b0b0f] text-amber-50">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                {backHref && (
                  <Link href={backHref} passHref>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-amber-400/30 bg-transparent text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-100"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Voltar ao menu</span>
                    </Button>
                  </Link>
                )}
                <Icons.logo className="h-7 w-7 text-amber-400" strokeWidth={1.5} />
                <h1 className="font-serif text-xl leading-tight md:text-2xl">EvoluaConsults</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-100/60">Período:</span>
                <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
              </div>
            </div>
            <div
            className="flex flex-1 rounded-2xl border border-amber-400/15 bg-white/[0.03]"
            data-x-chunk="dashboard-02-chunk-1"
            >
            <div className="container mx-auto py-8">
                <div className="grid gap-6">
                    <Overview transactions={monthTransactions} />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                        <RecentTransactions
                            transactions={monthTransactions}
                            categories={categories}
                            onAddTransaction={handleAddTransaction}
                            loading={transactionsLoading || categoriesLoading}
                            isReadOnly={!isOwner}
                        />
                        </div>
                        <div className="space-y-6">
                          <CategorySpending transactions={monthTransactions} categories={categories} />
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

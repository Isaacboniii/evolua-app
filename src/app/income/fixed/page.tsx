'use client'

import { Header } from "@/components/dashboard/header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemo } from 'react';
import { query, where, collection } from 'firebase/firestore';
import { AuthGate } from "@/components/auth-gate";
import type { Transaction, Category } from "@/lib/types";

export default function FixedIncomePage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const transactionsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `users/${user.uid}/transactions`),
      where('type', '==', 'income'),
      where('incomeType', '==', 'fixed')
    );
  }, [firestore, user]);
  
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'));
  }, [firestore]);
  const { data: categoriesData } = useCollection<Category>(categoriesQuery);
  const categories = categoriesData || [];

  const fixedIncomeTransactions = transactions || [];

  return (
    <AuthGate>
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <div className="flex items-center gap-4">
            <Link href="/financas" passHref>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
              </Button>
            </Link>
            <h1 className="text-lg font-semibold md:text-2xl">Renda Fixa</h1>
          </div>
          <div
            className="flex flex-1 rounded-lg border border-dashed shadow-sm p-4"
          >
              <TransactionsTable 
                  initialTransactions={fixedIncomeTransactions} 
                  categories={categories}
                  transactionType="income"
                  incomeType="fixed"
                  title="Renda Fixa"
                  description="Uma lista de todas as suas fontes de renda fixas."
              />
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

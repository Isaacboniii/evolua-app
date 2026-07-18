'use client'

import { Header } from "@/components/dashboard/header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCollection, useFirestore, useActivePanel } from '@/firebase';
import { useMemo } from 'react';
import { query, where, collection } from 'firebase/firestore';
import { AuthGate } from "@/components/auth-gate";
import type { Transaction, Category } from "@/lib/types";

export default function ExpensesPage() {
  const firestore = useFirestore();
  // Membro vê o painel do dono em somente leitura; dono vê o próprio com escrita.
  const { targetUserId, isReadOnly, loading } = useActivePanel();

  const transactionsQuery = useMemo(() => {
    if (!firestore || !targetUserId) return null;
    return query(
      collection(firestore, `users/${targetUserId}/transactions`),
      where('type', '==', 'expense')
    );
  }, [firestore, targetUserId]);
  
  const { data: transactions, loading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
  
  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'));
  }, [firestore]);
  const { data: categoriesData } = useCollection<Category>(categoriesQuery);
  const categories = categoriesData || [];

  const expenseTransactions = transactions || [];

  // Aguarda o perfil: sem isso o membro veria um flash do próprio painel
  // (vazio, editável) antes de o panelOwnerId chegar e ligar o somente-leitura.
  if (loading) {
    return (
      <AuthGate>
        <div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>
      </AuthGate>
    );
  }

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
            <h1 className="text-lg font-semibold md:text-2xl">Despesas</h1>
          </div>
          <div
            className="flex flex-1 rounded-lg border border-dashed shadow-sm p-2 sm:p-4"
          >
              <TransactionsTable
                  targetUserId={targetUserId}
                  initialTransactions={expenseTransactions}
                  categories={categories}
                  transactionType="expense"
                  title="Todas as Despesas"
                  description="Uma lista de todas as suas despesas."
                  isReadOnly={isReadOnly}
              />
          </div>
        </main>
      </div>
    </AuthGate>
  );
}

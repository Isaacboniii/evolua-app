export type UserProfile = {
  id: string;
  displayName: string;
  clientName?: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
  sharedWith?: string[];
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'paid' | 'pending';
  incomeType?: 'fixed' | 'variable' | 'projected';
  expenseType?: 'single' | 'monthly_fixed' | 'installments';
  installments?: {
    current: number;
    total: number;
  };
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
};

export type Budget = {
  category: string;
  amount: number;
};

export type Projections = {
  month: string;
  income: number;
  expenses: number;
};

export type UserProfile = {
  id: string;
  displayName: string;
  clientName?: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
  // uid do dono do painel do qual este usuário é membro (somente leitura).
  // Presença do campo => o app resolve o painel do dono em vez do próprio.
  panelOwnerId?: string;
};

// Doc de invites/{email} — o ID é sempre o email do convidado em minúsculas.
export type PanelInvite = {
  id: string;
  panelOwnerId: string;
  panelName?: string;
  invitedBy?: string;
  createdAt?: string;
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

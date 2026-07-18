export type UserProfile = {
  id: string;
  displayName: string;
  clientName?: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
  // uid do dono do painel do qual este usuário é membro (somente leitura).
  // Presença do campo => o app resolve o painel do dono em vez do próprio.
  // Gravado pelo admin (vínculo direto) ou pelo claim no primeiro login (convite).
  panelOwnerId?: string;
  // Permissão do membro DENTRO do painel do dono: 'editor' pode escrever, ausente
  // ou 'viewer' é somente leitura. Só o admin altera (garantido nas rules); membro
  // não se autopromove. Sem panelOwnerId, o campo é irrelevante (o dono sempre escreve).
  panelRole?: 'viewer' | 'editor';
};

// Convite pendente. O ID do doc é o email do convidado em minúsculas. É reivindicado
// no primeiro login (Google ou senha) e então apagado.
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

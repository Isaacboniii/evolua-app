# 📊 Evolua Consults

Painel de controle financeiro para gestão de clientes, receitas, despesas e transações.

## ✨ Funcionalidades

- 🔐 **Autenticação** — Login seguro com Firebase Authentication
- 📈 **Dashboard** — Visão geral financeira com gráficos interativos
- 💰 **Receitas** — Registro e acompanhamento de entradas
- 💸 **Despesas** — Controle detalhado de gastos
- 🔄 **Transações** — Histórico completo de movimentações
- ⚙️ **Configurações** — Personalização do painel
- 🛡️ **Painel Admin** — Área administrativa com controle de acesso
- 🌙 **Tema Claro/Escuro** — Alternância de tema integrada

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| [Next.js 15](https://nextjs.org/) | Framework React com App Router |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Firebase](https://firebase.google.com/) | Auth, Firestore e Hosting |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização utilitária |
| [Radix UI](https://www.radix-ui.com/) | Componentes acessíveis |
| [Recharts](https://recharts.org/) | Gráficos e visualizações |
| [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Formulários e validação |

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Projeto Firebase configurado

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Isaacboniii/evolua-app.git
cd evolua-app

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha com suas credenciais do Firebase

# Rode o servidor de desenvolvimento
npm run dev
```

O app estará disponível em [http://localhost:3000](http://localhost:3000).

## 📁 Estrutura do Projeto

```
src/
├── app/              # Rotas (App Router)
│   ├── admin/        # Painel administrativo
│   ├── expenses/     # Página de despesas
│   ├── income/       # Página de receitas
│   ├── login/        # Página de login
│   ├── settings/     # Configurações
│   └── transactions/ # Transações
├── components/       # Componentes React
│   ├── dashboard/    # Componentes do dashboard
│   ├── transactions/ # Componentes de transações
│   └── ui/           # Componentes base (Radix)
├── firebase/         # Configuração e hooks do Firebase
├── hooks/            # Custom hooks
└── lib/              # Utilitários
```

## 📜 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Executa o linter |
| `npm run typecheck` | Verifica os tipos TypeScript |

## 📄 Licença

Este projeto é privado e de uso exclusivo da Evolua Consults.

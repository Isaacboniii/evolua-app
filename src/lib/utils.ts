import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateForDisplay(dateString: string): string {
  if (!dateString || !dateString.includes("-")) {
    return dateString;
  }
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return dateString;
  }
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export const getAuthErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'O formato do email é inválido.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email ou senha incorretos.';
      case 'auth/email-already-in-use':
        return 'Este email já está sendo usado por outra conta.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Tente uma mais forte com pelo menos 6 caracteres.';
      case 'auth/configuration-not-found':
        return 'Configuração de autenticação não encontrada. Verifique as configurações do seu projeto Firebase e se o método de login está ativo.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  };

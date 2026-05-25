import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'EvoluaConsults',
  description: 'Painel de controle para seus clientes.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
          <FirebaseClientProvider>
            <Providers>{children}</Providers>
          </FirebaseClientProvider>
      </body>
    </html>
  );
}

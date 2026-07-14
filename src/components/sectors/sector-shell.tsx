'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';

interface SectorShellProps {
  title: string;
  description?: string;
  backHref: string;
  children: React.ReactNode;
}

export function SectorShell({ title, description, backHref, children }: SectorShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-[#0b0b0f] via-[#12100c] to-[#0b0b0f] text-amber-50">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center gap-4">
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
          <div>
            <h1 className="font-serif text-2xl leading-tight md:text-3xl">{title}</h1>
            {description && <p className="text-sm text-amber-100/60">{description}</p>}
          </div>
        </div>
        <div className="flex flex-1 flex-col rounded-2xl border border-amber-400/15 bg-white/[0.03] p-5 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

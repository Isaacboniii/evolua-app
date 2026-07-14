'use client';

import { useState } from 'react';
import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MonthPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  // Ano em foco DENTRO do popover, separado do mês selecionado:
  // permite folhear anos sem já escolher um mês.
  const [viewYear, setViewYear] = useState(() => value.getFullYear());

  const today = startOfMonth(new Date());
  const months = Array.from({ length: 12 }, (_, i) => i);

  const selectMonth = (monthIndex: number) => {
    onChange(startOfMonth(new Date(viewYear, monthIndex, 1)));
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(startOfMonth(addMonths(value, -1)))}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Mês anterior</span>
      </Button>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setViewYear(value.getFullYear());
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-8 min-w-[150px] justify-center capitalize">
            {format(value, "MMMM 'de' yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear((y) => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Ano anterior</span>
            </Button>
            <span className="text-sm font-medium">{viewYear}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear((y) => y + 1)}>
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Próximo ano</span>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {months.map((m) => {
              const monthDate = new Date(viewYear, m, 1);
              const isSelected = isSameMonth(monthDate, value);
              const isCurrent = isSameMonth(monthDate, today);
              return (
                <Button
                  key={m}
                  variant={isSelected ? 'default' : 'ghost'}
                  size="sm"
                  className={cn('capitalize', isCurrent && !isSelected && 'border border-primary')}
                  onClick={() => selectMonth(m)}
                >
                  {format(monthDate, 'MMM', { locale: ptBR })}
                </Button>
              );
            })}
          </div>

          <Button
            variant="link"
            size="sm"
            className="mt-2 w-full"
            onClick={() => {
              onChange(today);
              setOpen(false);
            }}
          >
            Mês atual
          </Button>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(startOfMonth(addMonths(value, 1)))}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Próximo mês</span>
      </Button>
    </div>
  );
}

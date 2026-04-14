import { formatDateEn } from '@/lib/format'
import { getWeekEnd, getWeekStart } from '@/lib/weekUtils'
import { CalendarRange } from 'lucide-react'
import type { DateArg } from 'date-fns'

type HeaderProps = {
  weekReference: DateArg<Date>
}

export function Header({ weekReference }: HeaderProps) {
  const d = new Date(weekReference as Date)
  const start = getWeekStart(d)
  const end = getWeekEnd(d)

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-app-card px-4 py-3 text-right shadow-sm sm:px-6 sm:py-3.5 lg:px-8">
      <h1 className="text-base font-bold tracking-tight text-[var(--color-text-primary)] sm:text-lg">
        نظام إدارة رواتب الموظفين
      </h1>
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        <CalendarRange className="h-5 w-5 shrink-0 text-[var(--color-accent-blue)]" />
        <span className="text-center font-mono-nums text-sm text-[var(--color-text-primary)]" dir="ltr">
          {formatDateEn(start)} — {formatDateEn(end)}
        </span>
      </div>
    </header>
  )
}

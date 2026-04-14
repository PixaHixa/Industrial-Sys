import { cn } from '@/lib/utils'
import { LayoutDashboard, Clock, Users, FileText } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { format } from 'date-fns'
import { getWeekEnd } from '@/lib/weekUtils'

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'الدوام', icon: Clock, end: false },
  { to: '/employees', label: 'الموظفون', icon: Users, end: false },
  { to: '/reports', label: 'التقارير', icon: FileText, end: false },
] as const

type SidebarProps = {
  weekStart: Date
}

export function Sidebar({ weekStart }: SidebarProps) {
  const weekEnd = getWeekEnd(weekStart)
  const rangeLabel = `${format(weekStart, 'dd/MM')} — ${format(weekEnd, 'dd/MM')}`

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col border-s border-[var(--color-border)] bg-app-card shadow-sm sm:w-[272px]"
      dir="rtl"
    >
      <nav className="flex flex-1 flex-col gap-1 p-4 pt-6 sm:p-5 sm:pt-8">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-row-reverse items-center justify-end gap-3 rounded-xl px-4 py-3 text-right text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--color-accent-blue-bg)] text-[var(--color-accent-blue)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-[var(--color-border)] p-4 text-right text-sm text-[var(--color-text-secondary)]">
        <p className="text-xs text-[var(--color-text-muted)]">الأسبوع المعروض</p>
        <p className="mt-1 font-mono-nums font-semibold text-[var(--color-accent-blue)]" dir="ltr">
          {rangeLabel}
        </p>
      </div>
    </aside>
  )
}

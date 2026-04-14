import { useMemo } from 'react'
import { WEEK_ORDER, getRowDateForWeekRow } from '@/lib/weekUtils'
import { roundDisplay, toYmd } from '@/lib/format'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import type { Attendance, Employee } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

type ReportTableProps = {
  weekStart: Date
  employees: Employee[]
  attendance: Attendance[]
  loading: boolean
}

export function ReportTable({ weekStart, employees, attendance, loading }: ReportTableProps) {
  const wsStr = toYmd(weekStart)

  const summary = useMemo(() => {
    let total = 0
    let days = 0
    for (const a of attendance) {
      if (a.week_start_date !== wsStr) continue
      total += a.daily_wage ?? 0
      if ((a.daily_wage ?? 0) > 0) days += 1
    }
    const avg = days > 0 ? total / days : 0
    return { total, days, avg }
  }, [attendance, wsStr])

  const perEmployee = useMemo(() => {
    return employees.map((e) => {
      let sum = 0
      const rows = WEEK_ORDER.map((label) => {
        const d = getRowDateForWeekRow(weekStart, label)
        const ds = toYmd(d)
        const att = findAttendanceCell(attendance, e.id, wsStr, label, ds)
        const wage = att?.daily_wage ?? null
        if (wage != null) sum += wage
        return { label, att, wage }
      })
      return { employee: e, rows, sum }
    })
  }, [employees, attendance, weekStart, wsStr])

  if (loading) {
    return <Skeleton className="h-[500px] w-full rounded-2xl" />
  }

  if (employees.length === 0) {
    return <p className="text-[var(--color-text-secondary)]">لا يوجد موظفون لعرض التقرير.</p>
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5" dir="rtl">
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">إجمالي الرواتب</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-bold text-[var(--color-success)]">
            د.أ {roundDisplay(summary.total)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">أيام الدوام</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-bold text-[var(--color-accent-blue)]">
            {summary.days}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
          <p className="text-sm text-[var(--color-text-secondary)]">متوسط اليومي</p>
          <p className="mt-2 text-center font-mono-nums text-xl font-bold text-[var(--color-accent-blue)]">
            د.أ {roundDisplay(summary.avg)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-app-card shadow-sm">
        <table className="w-full table-fixed border-collapse text-sm" dir="rtl">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
              <th className="p-3.5 text-right text-xs font-semibold text-[var(--color-text-primary)] sm:p-4">
                الموظف
              </th>
              {WEEK_ORDER.map((l) => (
                <th key={l} className="p-2 text-center text-[11px] font-semibold leading-tight text-[var(--color-text-primary)]">
                  {l}
                </th>
              ))}
              <th className="p-3 text-center text-xs font-semibold text-[var(--color-success)]">المجموع</th>
            </tr>
          </thead>
          <tbody>
            {perEmployee.map(({ employee: e, rows, sum }, idx) => (
              <tr
                key={e.id}
                className={
                  idx % 2 === 0
                    ? 'border-b border-[var(--color-border)]/50 bg-[var(--color-bg-elevated)]/15'
                    : 'border-b border-[var(--color-border)]/50'
                }
              >
                <td className="p-3 text-right align-middle font-semibold text-[var(--color-text-primary)]">
                  {e.name}{' '}
                  <span className="font-mono-nums text-[var(--color-accent-blue)]">({e.employee_id})</span>
                </td>
                {rows.map(({ label, wage }) => (
                  <td key={label} className="p-2 text-center align-middle font-mono-nums text-xs">
                    {wage != null ? roundDisplay(wage) : '—'}
                  </td>
                ))}
                <td className="p-3 text-center align-middle font-mono-nums font-bold text-[var(--color-success)]">
                  {roundDisplay(sum)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-[var(--color-border)] bg-[var(--color-success-bg)]/40 font-bold text-[var(--color-text-primary)]">
              <td className="p-3.5 text-right sm:p-4">المجموع الكلي</td>
              {WEEK_ORDER.map((label) => {
                const d = getRowDateForWeekRow(weekStart, label)
                const ds = toYmd(d)
                let daySum = 0
                for (const emp of employees) {
                  const att = findAttendanceCell(attendance, emp.id, wsStr, label, ds)
                  if (att?.daily_wage != null) daySum += att.daily_wage
                }
                return (
                  <td key={label} className="p-2 text-center align-middle font-mono-nums text-xs">
                    {roundDisplay(daySum)}
                  </td>
                )
              })}
              <td className="p-3 text-center align-middle font-mono-nums text-[var(--color-success)]">
                {roundDisplay(summary.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

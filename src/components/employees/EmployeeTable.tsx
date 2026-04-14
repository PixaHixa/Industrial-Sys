import { roundDisplay } from '@/lib/format'
import type { Employee } from '@/types'
import { Button } from '@/components/ui/Button'
import { Pencil, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

type EmployeeTableProps = {
  employees: Employee[]
  loading: boolean
  onEdit: (e: Employee) => void
  onDeleteRequest: (e: Employee) => void
}

export function EmployeeTable({ employees, loading, onEdit, onDeleteRequest }: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-[var(--color-border)] bg-app-card p-5 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-app-card/80 p-10 text-center text-[var(--color-text-secondary)] shadow-sm">
        لا يوجد موظفون بعد. استخدم النموذج المجاور لإضافة موظف.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-app-card shadow-sm">
      <table className="w-full table-fixed border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]/55 text-xs font-semibold text-[var(--color-text-secondary)]">
            <th className="w-[9%] px-2 py-3.5 text-center font-mono-nums">المعرف</th>
            <th className="w-[22%] px-3 py-3.5 text-right">الاسم</th>
            <th className="w-[13%] px-2 py-3.5 text-center font-mono-nums">سعر الساعة</th>
            <th className="w-[13%] px-2 py-3.5 text-center font-mono-nums">المواصلات</th>
            <th className="w-[13%] px-2 py-3.5 text-center font-mono-nums">اليومية</th>
            <th className="w-[13%] px-2 py-3.5 text-center font-mono-nums">الأسبوعية</th>
            <th className="w-[17%] px-2 py-3.5 text-center">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e, idx) => (
            <tr
              key={e.id}
              className={
                idx % 2 === 0
                  ? 'border-b border-[var(--color-border)]/40 bg-[var(--color-bg-elevated)]/12'
                  : 'border-b border-[var(--color-border)]/40'
              }
            >
              <td className="px-2 py-3.5 text-center align-middle font-mono-nums font-semibold text-[var(--color-accent-blue)]">
                {e.employee_id}
              </td>
              <td className="px-3 py-3.5 text-right align-middle font-medium text-[var(--color-text-primary)]">
                {e.name}
              </td>
              <td className="px-2 py-3.5 text-center align-middle font-mono-nums text-[var(--color-text-primary)]">
                {roundDisplay(e.hourly_rate)}
              </td>
              <td className="px-2 py-3.5 text-center align-middle font-mono-nums text-[var(--color-text-primary)]">
                {roundDisplay(e.transport_allowance)}
              </td>
              <td className="px-2 py-3.5 text-center align-middle font-mono-nums text-[var(--color-success)]">
                {roundDisplay(e.hourly_rate * 8)}
              </td>
              <td className="px-2 py-3.5 text-center align-middle font-mono-nums text-[var(--color-success)]">
                {roundDisplay(e.hourly_rate * 8 * 6)}
              </td>
              <td className="px-2 py-3.5 text-center align-middle">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(e)}>
                    <Pencil className="h-4 w-4" /> تعديل
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDeleteRequest(e)}>
                    <Trash2 className="h-4 w-4" /> حذف
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

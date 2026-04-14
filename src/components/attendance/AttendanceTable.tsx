import { WEEK_ORDER, getRowDateForWeekRow, type WeekDayLabel } from '@/lib/weekUtils'
import { formatDateEn, roundDisplay, toYmd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import type { Attendance, Employee } from '@/types'
import { cn } from '@/lib/utils'
import { formatTime12From24 } from '@/lib/timeFormat'
import { findAttendanceCell } from '@/lib/attendanceLookup'

type AttendanceTableProps = {
  employee: Employee
  weekStart: Date
  rows: Attendance[]
  onAdd: (rowLabel: WeekDayLabel, rowDate: Date) => void
  onEdit: (rowLabel: WeekDayLabel, rowDate: Date, att: Attendance) => void
  onDeleteRow: (att: Attendance) => void
}

export function AttendanceTable({
  employee: _employee,
  weekStart,
  rows,
  onAdd,
  onEdit,
  onDeleteRow,
}: AttendanceTableProps) {
  const wsStr = toYmd(weekStart)

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-app-card shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm" dir="rtl">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]">
            <th className="p-4 text-right font-semibold text-[var(--color-text-primary)]">اليوم</th>
            <th className="p-4 text-center font-semibold font-mono-nums text-[var(--color-text-primary)]">التاريخ</th>
            <th className="p-4 text-right font-semibold text-[var(--color-text-primary)]">الدوام</th>
            <th className="p-4 text-center font-semibold font-mono-nums text-[var(--color-text-primary)]">الراتب</th>
            <th className="p-4 text-center font-semibold text-[var(--color-text-primary)]">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((rowLabel, idx) => {
            const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
            const rowDateStr = toYmd(rowDate)
            const att = findAttendanceCell(rows, _employee.id, wsStr, rowLabel, rowDateStr)
            const isFriday = rowLabel === 'الجمعة'
            const isWedNight = rowLabel === 'سهرة الأربعاء'
            const absent = !att && !isFriday && !isWedNight

            const rowBg = isWedNight
              ? 'bg-[var(--color-gold-bg)]/45'
              : isFriday
                ? 'bg-[var(--color-purple-bg)]/55'
                : idx % 2 === 0
                  ? 'bg-[var(--color-bg-base)]'
                  : 'bg-transparent'

            return (
              <tr
                key={rowLabel}
                className={cn(
                  'border-b border-[var(--color-border)]/80 transition-colors hover:bg-[var(--color-bg-surface)]/40',
                  rowBg
                )}
              >
                <td className="p-4 text-right align-middle font-semibold">
                  <span
                    className={cn(
                      isWedNight && 'text-[var(--color-gold)]',
                      isFriday && 'text-[var(--color-purple)]'
                    )}
                  >
                    {rowLabel}
                    {isWedNight ? <Star className="ms-1 inline h-4 w-4 text-[var(--color-gold)]" /> : null}
                  </span>
                </td>
                <td className="p-4 text-center align-middle font-mono-nums text-[var(--color-accent-blue)]">
                  {formatDateEn(rowDate)}
                </td>
                <td className="p-4 text-right align-middle">
                  {att?.is_carried_over ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge className="border border-[var(--color-gold-bg)] bg-[var(--color-gold-bg)] text-[var(--color-gold)]">
                        مُرحّل
                      </Badge>
                      <span className="text-[var(--color-text-muted)]">—</span>
                    </div>
                  ) : att ? (
                    <span
                      dir="rtl"
                      className="inline-flex items-center justify-center gap-2 font-mono-nums text-[var(--color-text-primary)]"
                    >
                      <span dir="ltr">{formatTime12From24(att.check_in)}</span>
                      <span className="text-[var(--color-text-muted)]" dir="ltr">
                        —
                      </span>
                      <span dir="ltr">{formatTime12From24(att.check_out)}</span>
                    </span>
                  ) : absent ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-2.5 py-1 text-sm font-semibold text-[var(--color-danger)]">
                      <X className="h-4 w-4 shrink-0" /> غياب
                    </span>
                  ) : (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                <td className="p-4 text-center align-middle font-mono-nums font-bold text-[var(--color-success)]">
                  {att && att.daily_wage != null ? `د.أ ${roundDisplay(att.daily_wage)}` : '—'}
                </td>
                <td className="p-4 text-center align-middle">
                  <div className="flex flex-wrap justify-center gap-2">
                    {att ? (
                      <>
                        {!att.is_carried_over ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onEdit(rowLabel, rowDate, att)}
                            >
                              <Pencil className="h-4 w-4" /> تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => onDeleteRow(att)}
                            >
                              <Trash2 className="h-4 w-4" /> حذف
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => onDeleteRow(att)}>
                            <Trash2 className="h-4 w-4" /> حذف
                          </Button>
                        )}
                      </>
                    ) : isWedNight || isFriday ? null : (
                      <Button size="sm" variant="primary" onClick={() => onAdd(rowLabel, rowDate)}>
                        <Plus className="h-4 w-4" /> إضافة
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

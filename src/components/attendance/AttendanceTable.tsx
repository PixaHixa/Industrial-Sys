import { WEEK_ORDER, getRowDateForWeekRow, type WeekDayLabel } from '@/lib/weekUtils'
import { formatDateEn, roundDisplay, toYmd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Attendance, Employee } from '@/types'
import { cn } from '@/lib/utils'
import { formatTime12From24 } from '@/lib/timeFormat'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'
import {
  numNeutral,
  tableBaseClass,
  tableCellLast,
  tableHeadCell,
  tableHeadSticky,
  tableRowCell,
  tableRowGroup,
  tableShellClass,
} from '@/lib/tableUi'

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
  const { fridayAttendanceEnabled } = useFridayAttendance()
  const wsStr = toYmd(weekStart)

  return (
    <div className={tableShellClass}>
      <table className={cn(tableBaseClass, 'table-fixed min-w-[680px]')} dir="rtl">
        <thead>
          <tr>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[18%] min-w-0 text-right')}>اليوم</th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[14%] min-w-0 text-center font-mono-nums')}>
              التاريخ
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 min-w-0 text-right')}>
              الدوام
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-[12%] min-w-0 text-center font-mono-nums')}>
              الراتب
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, tableCellLast, 'z-20 text-center')}>
              إجراءات
            </th>
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((rowLabel, idx) => {
            const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
            const rowDateStr = toYmd(rowDate)
            const att = findAttendanceCell(rows, _employee.id, wsStr, rowLabel, rowDateStr)
            const isFriday = rowLabel === 'الجمعة'
            const isWedNight = rowLabel === 'سهرة الأربعاء'
            const absent = !att && !isWedNight && (!isFriday || fridayAttendanceEnabled)
            const zebra = idx % 2 === 0

            return (
              <tr key={rowLabel} className={tableRowGroup}>
                <td
                  className={cn(
                    tableRowCell(zebra),
                    'min-w-0 truncate text-right text-sm font-medium',
                    isWedNight && 'text-amber-900',
                    isFriday && 'text-indigo-900'
                  )}
                >
                  {rowLabel}
                  {isWedNight ? <Star className="ms-0.5 inline h-3 w-3 shrink-0 text-amber-600" /> : null}
                </td>
                <td
                  className={cn(
                    tableRowCell(zebra),
                    'min-w-0 truncate text-center font-mono-nums text-xs text-slate-600'
                  )}
                >
                  {formatDateEn(rowDate)}
                </td>
                <td className={cn(tableRowCell(zebra), 'min-w-0 text-right text-xs')}>
                  {att?.is_carried_over ? (
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Badge className="rounded-md border border-amber-200/60 bg-amber-50/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        مُرحّل
                      </Badge>
                      <span className="text-slate-400">—</span>
                    </div>
                  ) : att ? (
                    <span
                      dir="rtl"
                      className="inline-flex min-w-0 max-w-full items-center justify-end gap-1 truncate font-mono-nums text-slate-900"
                    >
                      <span dir="ltr" className="truncate">
                        {formatTime12From24(att.check_in)}
                      </span>
                      <span className="shrink-0 text-slate-400" dir="ltr">
                        —
                      </span>
                      <span dir="ltr" className="truncate">
                        {formatTime12From24(att.check_out)}
                      </span>
                    </span>
                  ) : absent ? (
                    <span
                      className="inline-block min-h-[1.25rem] min-w-[2.5rem] rounded-md bg-red-50/90 px-1.5 py-0.5 align-middle ring-1 ring-inset ring-red-100/80"
                      aria-label="غياب"
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={cn(tableRowCell(zebra), 'min-w-0 text-center font-mono-nums text-xs')}>
                  {att && att.daily_wage != null ? (
                    <span className={numNeutral}>د.أ {roundDisplay(att.daily_wage)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={cn(tableRowCell(zebra), tableCellLast, 'text-center')}>
                  <div className="flex flex-wrap justify-center gap-1">
                    {att ? (
                      <>
                        {!att.is_carried_over ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 gap-1 rounded-md px-2 py-1 text-xs"
                              onClick={() => onEdit(rowLabel, rowDate, att)}
                            >
                              <Pencil className="h-3 w-3 shrink-0" /> تعديل
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-7 gap-1 rounded-md px-2 py-1 text-xs"
                              onClick={() => onDeleteRow(att)}
                            >
                              <Trash2 className="h-3 w-3 shrink-0" /> حذف
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            className="h-7 gap-1 rounded-md px-2 py-1 text-xs"
                            onClick={() => onDeleteRow(att)}
                          >
                            <Trash2 className="h-3 w-3 shrink-0" /> حذف
                          </Button>
                        )}
                      </>
                    ) : isWedNight ? null : isFriday && !fridayAttendanceEnabled ? null : (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 gap-1 rounded-md px-2 py-1 text-xs"
                        onClick={() => onAdd(rowLabel, rowDate)}
                      >
                        <Plus className="h-3 w-3 shrink-0" /> إضافة
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

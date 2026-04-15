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
      <table className={cn(tableBaseClass, 'min-w-[680px]')} dir="rtl">
        <thead>
          <tr>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 min-w-[7rem] text-right')}>اليوم</th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
              التاريخ
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 min-w-[11rem] text-right')}>
              الدوام
            </th>
            <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
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
                    'text-right text-sm font-semibold sm:text-[15px]',
                    isWedNight && 'text-amber-900',
                    isFriday && 'text-indigo-900'
                  )}
                >
                  {rowLabel}
                  {isWedNight ? <Star className="ms-1 inline h-4 w-4 text-amber-600" /> : null}
                </td>
                <td
                  className={cn(
                    tableRowCell(zebra),
                    'text-center font-mono-nums text-sm text-slate-600 sm:text-[15px]'
                  )}
                >
                  {formatDateEn(rowDate)}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-right text-sm sm:text-[15px]')}>
                  {att?.is_carried_over ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge className="border border-amber-200/80 bg-amber-50 text-amber-900">
                        مُرحّل
                      </Badge>
                      <span className="text-slate-400">—</span>
                    </div>
                  ) : att ? (
                    <span
                      dir="rtl"
                      className="inline-flex items-center justify-center gap-2 font-mono-nums text-slate-900"
                    >
                      <span dir="ltr">{formatTime12From24(att.check_in)}</span>
                      <span className="text-slate-400" dir="ltr">
                        —
                      </span>
                      <span dir="ltr">{formatTime12From24(att.check_out)}</span>
                    </span>
                  ) : absent ? (
                    <span
                      className="inline-block min-h-[1.5rem] min-w-[3rem] rounded-md bg-red-50 px-2.5 py-1 align-middle ring-1 ring-inset ring-red-100"
                      aria-label="غياب"
                    />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-sm sm:text-[15px]')}>
                  {att && att.daily_wage != null ? (
                    <span className={numNeutral}>د.أ {roundDisplay(att.daily_wage)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={cn(tableRowCell(zebra), tableCellLast, 'text-center')}>
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
                    ) : isWedNight ? null : isFriday && !fridayAttendanceEnabled ? null : (
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

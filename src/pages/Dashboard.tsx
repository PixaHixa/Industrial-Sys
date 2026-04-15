import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WeekPicker } from '@/components/attendance/WeekPicker'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDateEn, roundDisplay, toYmd } from '@/lib/format'
import { getWeekEnd, getWeekStart, WEEK_ORDER, getRowDateForWeekRow } from '@/lib/weekUtils'
import { findAttendanceCell } from '@/lib/attendanceLookup'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseAttendance, parseEmployee, type Attendance, type Employee } from '@/types'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { formatTime12From24 } from '@/lib/timeFormat'
import { isWithinInterval, parse, startOfDay } from 'date-fns'
import { getArabicWeekdayName } from '@/lib/weekUtils'
import {
  numNeutral,
  tableBaseClass,
  tableCellLast,
  tableHeadCell,
  tableHeadSticky,
  tableRowCell,
  tableRowGroup,
  tableShellClass,
  tableTotalCell,
  tableTotalRow,
} from '@/lib/tableUi'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'

export function Dashboard() {
  const { fridayAttendanceEnabled } = useFridayAttendance()
  const [weekRef, setWeekRef] = useState(() => getWeekStart(new Date()))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDay, setDetailDay] = useState(() => getWeekStart(new Date()))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const weekStart = getWeekStart(weekRef)
  const weekEnd = getWeekEnd(weekRef)
  const wsStr = toYmd(weekStart)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      setAttendance([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [empRes, attRes] = await Promise.all([
        supabase.from('employees').select('*').order('employee_id'),
        supabase.from('attendance').select('*').eq('week_start_date', wsStr),
      ])
      if (empRes.error) throw empRes.error
      if (attRes.error) throw attRes.error
      setEmployees((empRes.data ?? []).map(parseEmployee))
      setAttendance((attRes.data ?? []).map(parseAttendance))
    } catch (e) {
      console.error(e)
      setEmployees([])
      setAttendance([])
    } finally {
      setLoading(false)
    }
  }, [wsStr])

  useEffect(() => {
    void load()
  }, [load])

  /** عند تغيير الأسبوع فقط — تجنب الاعتماد على كائن `weekStart` الجديد كل تصيير (كان يعيد ضبط التاريخ ويثقل التطبيق) */
  useEffect(() => {
    setDetailDay((prev) => {
      const ws = startOfDay(parse(wsStr, 'yyyy-MM-dd', new Date()))
      const we = startOfDay(getWeekEnd(ws))
      if (isWithinInterval(startOfDay(prev), { start: ws, end: we })) return prev
      return ws
    })
    setSelectedIds(new Set())
  }, [wsStr])

  const stats = useMemo(() => {
    let total = 0
    const byEmp: Record<string, number> = {}
    let days = 0
    const activeIds = new Set<string>()
    for (const a of attendance) {
      const w = a.daily_wage ?? 0
      total += w
      byEmp[a.employee_id] = (byEmp[a.employee_id] ?? 0) + w
      if (w > 0) {
        days += 1
        activeIds.add(a.employee_id)
      }
    }
    let topName = '—'
    let topVal = -1
    for (const e of employees) {
      const v = byEmp[e.id] ?? 0
      if (v > topVal) {
        topVal = v
        topName = e.name
      }
    }
    return { total, days, topName, topVal, byEmp, activeCount: activeIds.size }
  }, [attendance, employees])

  const toggleSel = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const detailYmd = toYmd(detailDay)
  const detailDayArabic = useMemo(() => getArabicWeekdayName(detailDay), [detailDay])
  const detailIsFriday = detailDayArabic === 'الجمعة'
  const detailFridayRestDay = detailIsFriday && !fridayAttendanceEnabled

  const detailRows = useMemo(() => {
    return employees.map((e) => {
      const att =
        attendance.find(
          (a) =>
            a.employee_id === e.id && a.week_start_date === wsStr && a.date === detailYmd && !a.is_carried_over
        ) ?? null
      return { employee: e, att }
    })
  }, [employees, attendance, wsStr, detailYmd])

  const selectedSum = useMemo(() => {
    let s = 0
    for (const r of detailRows) {
      if (!selectedIds.has(r.employee.id) || !r.att || r.att.daily_wage == null) continue
      s += r.att.daily_wage
    }
    return s
  }, [detailRows, selectedIds])

  return (
    <Layout weekReference={weekStart}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">لوحة التحكم</h2>
        <WeekPicker value={weekRef} onChange={(d) => setWeekRef(d)} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">إجمالي رواتب الأسبوع</p>
              <p className={cn('mt-3 text-center font-mono-nums text-2xl font-semibold text-slate-800')}>
                د.أ {roundDisplay(stats.total)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">الموظفون النشطون هذا الأسبوع</p>
              <p className="mt-3 text-center font-mono-nums text-2xl font-semibold text-slate-800" dir="ltr">
                <span className="text-slate-800">{stats.activeCount}</span>
                <span className="text-[var(--color-text-muted)]"> / </span>
                <span className="text-[var(--color-text-primary)]">{employees.length}</span>
              </p>
              <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">نشطون / إجمالي الموظفين</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">أيام الدوام المسجلة</p>
              <p className="mt-3 text-center font-mono-nums text-2xl font-bold text-[var(--color-accent-blue)]">
                {stats.days}{' '}
                <span className="text-base font-semibold text-[var(--color-text-secondary)]">يوم</span>
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">الأعلى راتباً</p>
              <p className="mt-3 text-right text-lg font-bold text-[var(--color-text-primary)]">{stats.topName}</p>
              <p className="mt-1 text-center font-mono-nums text-xl font-semibold text-slate-800">
                {stats.topVal >= 0 ? `د.أ ${roundDisplay(stats.topVal)}` : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className={tableShellClass}>
        {loading ? (
          <Skeleton className="m-4 h-96 w-full min-w-[800px]" />
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-text-secondary)]">
            لم تُضف أي موظف بعد. افتح صفحة «الموظفون» لإضافة الفريق ثم ارجع لهذه اللوحة.
          </p>
        ) : (
          <table className={cn(tableBaseClass, 'min-w-[920px]')} dir="rtl">
            <thead>
              <tr>
                <th
                  className={cn(
                    tableHeadCell,
                    tableHeadSticky,
                    'sticky start-0 z-30 min-w-[150px] text-right shadow-[1px_0_0_rgb(203,213,225)]'
                  )}
                >
                  اليوم / التاريخ
                </th>
                {employees.map((e) => (
                  <th
                    key={e.id}
                    className={cn(tableHeadCell, tableHeadSticky, 'z-20 whitespace-nowrap text-center font-semibold')}
                  >
                    {e.name}
                  </th>
                ))}
                <th
                  className={cn(tableHeadCell, tableHeadSticky, tableCellLast, 'z-20 text-center text-slate-900')}
                >
                  مجموع اليوم
                </th>
              </tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((rowLabel, idx) => {
                const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
                const rowDateStr = toYmd(rowDate)
                const isFriday = rowLabel === 'الجمعة'
                const isWedNight = rowLabel === 'سهرة الأربعاء'
                const zebra = idx % 2 === 0

                let daySum = 0
                const cells = employees.map((e) => {
                  const att = findAttendanceCell(attendance, e.id, wsStr, rowLabel, rowDateStr)
                  if (att?.daily_wage != null) daySum += att.daily_wage
                  const absent = !att && !isWedNight && (!isFriday || fridayAttendanceEnabled)
                  return { att, absent }
                })

                return (
                  <tr key={rowLabel} className={tableRowGroup}>
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        'sticky start-0 z-10 border-e-2 border-e-slate-300 text-right font-semibold leading-snug',
                        isWedNight && 'text-amber-900',
                        isFriday && 'text-indigo-900'
                      )}
                    >
                      {rowLabel}
                      {isWedNight ? <Star className="ms-1 inline h-4 w-4 text-amber-600" /> : null}
                      <div className="mt-0.5 font-mono-nums text-xs font-medium text-slate-500 sm:text-sm" dir="ltr">
                        {formatDateEn(rowDate)}
                      </div>
                    </td>
                    {cells.map(({ att, absent }, i) => (
                      <td
                        key={employees[i].id}
                        className={cn(tableRowCell(zebra), 'text-center font-mono-nums text-sm sm:text-[15px]')}
                      >
                        {att?.daily_wage != null ? (
                          <span className={numNeutral}>{roundDisplay(att.daily_wage)}</span>
                        ) : absent ? (
                          <span
                            className="inline-block min-h-[1.35rem] min-w-[3rem] rounded-md bg-red-50 px-2 py-1 align-middle ring-1 ring-inset ring-red-100 sm:min-h-[1.5rem]"
                            aria-label="غياب"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    ))}
                    <td
                      className={cn(
                        tableRowCell(zebra),
                        tableCellLast,
                        'text-center font-mono-nums text-sm font-bold text-slate-900 sm:text-[15px]'
                      )}
                    >
                      {daySum > 0 ? roundDisplay(daySum) : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr className={tableTotalRow}>
                <td
                  className={cn(
                    tableTotalCell('sticky start-0 z-10 border-e-2 border-e-slate-400/60 py-4 text-right text-base')
                  )}
                >
                  مجموع الأسبوع
                </td>
                {employees.map((e) => {
                  const sum = attendance
                    .filter((a) => a.employee_id === e.id && a.week_start_date === wsStr)
                    .reduce((s, a) => s + (a.daily_wage ?? 0), 0)
                  return (
                    <td
                      key={e.id}
                      className={cn(tableTotalCell('text-center font-mono-nums text-[15px]'))}
                    >
                      {roundDisplay(sum)}
                    </td>
                  )
                })}
                <td
                  className={cn(
                    tableTotalCell('text-center font-mono-nums text-base'),
                    tableCellLast
                  )}
                >
                  {roundDisplay(stats.total)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <section className="mt-10 space-y-5 text-right sm:mt-12">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] sm:text-xl">تفاصيل اليوم</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">اختر تاريخاً لعرض تفاصيل الدوام:</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <input
            type="date"
            lang="en"
            className="rounded-xl border border-[var(--color-border)] bg-app-card px-3 py-2.5 font-mono-nums text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/25"
            dir="ltr"
            value={toYmd(detailDay)}
            min={toYmd(weekStart)}
            max={toYmd(weekEnd)}
            onChange={(e) => {
              if (!e.target.value) return
              const d = startOfDay(parse(e.target.value, 'yyyy-MM-dd', new Date()))
              if (
                isWithinInterval(d, {
                  start: startOfDay(weekStart),
                  end: startOfDay(weekEnd),
                })
              ) {
                setDetailDay(d)
                setSelectedIds(new Set())
              }
            }}
          />
        </div>
        <div className={cn(tableShellClass, 'overflow-hidden')}>
          {employees.length === 0 ? (
            <p className="p-6 text-center text-[var(--color-text-secondary)]">أضف موظفين أولاً لعرض التفاصيل.</p>
          ) : (
            <table className={tableBaseClass} dir="rtl">
              <thead>
                <tr>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 w-12 max-w-[3rem] px-2 text-center')} />
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 min-w-[8rem] text-right')}>
                    الموظف
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
                    حضور
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
                    مغادرة
                  </th>
                  <th className={cn(tableHeadCell, tableHeadSticky, 'z-20 text-center font-mono-nums')}>
                    اليومية
                  </th>
                  <th
                    className={cn(
                      tableHeadCell,
                      tableHeadSticky,
                      tableCellLast,
                      'z-20 text-center font-mono-nums'
                    )}
                  >
                    اليوم
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map(({ employee: e, att }, idx) => {
                  const baseDaily = e.hourly_rate * 8
                  const sel = selectedIds.has(e.id)
                  const absent = !att && (!detailIsFriday || fridayAttendanceEnabled)
                  const zebra = idx % 2 === 0
                  const rowPick = sel && att ? '!bg-amber-100 group-hover/row:!bg-amber-200' : ''
                  return (
                    <tr key={e.id} className={tableRowGroup}>
                      <td className={cn(tableRowCell(zebra), 'text-center', rowPick)}>
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSel(e.id)}
                          disabled={!att}
                          className="h-4 w-4 accent-slate-700 disabled:opacity-40"
                        />
                      </td>
                      <td className={cn(tableRowCell(zebra), 'text-right font-semibold text-slate-900', rowPick)}>
                        {e.name}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-sm sm:text-[15px]',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : absent ? (
                          <span
                            className="inline-block min-h-[1.25rem] min-w-[2.75rem] rounded-md bg-red-50 px-2 py-0.5 align-middle ring-1 ring-inset ring-red-100 sm:text-sm"
                            aria-label="غياب"
                          />
                        ) : (
                          formatTime12From24(att!.check_in)
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-sm sm:text-[15px]',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : absent ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          formatTime12From24(att!.check_out)
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          'text-center font-mono-nums text-sm text-slate-600 sm:text-[15px]',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay ? (
                          <span className="text-slate-400">—</span>
                        ) : absent ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          roundDisplay(baseDaily)
                        )}
                      </td>
                      <td
                        className={cn(
                          tableRowCell(zebra),
                          tableCellLast,
                          'text-center font-mono-nums text-sm font-semibold sm:text-[15px]',
                          absent ? 'text-red-900' : 'text-slate-900',
                          rowPick
                        )}
                      >
                        {detailFridayRestDay
                          ? '—'
                          : absent
                            ? '—'
                            : att!.daily_wage != null
                              ? roundDisplay(att!.daily_wage)
                              : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-slate-700 shadow-sm sm:px-5">
          المحدد ({selectedIds.size}): د.أ{' '}
          <span className="font-mono-nums font-semibold text-slate-900">{roundDisplay(selectedSum)}</span>
        </div>
      </section>
    </Layout>
  )
}

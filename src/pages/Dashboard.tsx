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

export function Dashboard() {
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
              <p className="mt-3 text-center font-mono-nums text-2xl font-bold text-[var(--color-success)]">
                د.أ {roundDisplay(stats.total)}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-app-card p-5 text-right shadow-sm sm:p-6">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">الموظفون النشطون هذا الأسبوع</p>
              <p className="mt-3 text-center font-mono-nums text-2xl font-bold text-[var(--color-accent-blue)]" dir="ltr">
                <span className="text-[var(--color-success)]">{stats.activeCount}</span>
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
              <p className="mt-1 text-center font-mono-nums text-xl font-bold text-[var(--color-success)]">
                {stats.topVal >= 0 ? `د.أ ${roundDisplay(stats.topVal)}` : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-app-card shadow-sm">
        {loading ? (
          <Skeleton className="m-4 h-96 w-full min-w-[800px]" />
        ) : employees.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-text-secondary)]">
            لم تُضف أي موظف بعد. افتح صفحة «الموظفون» لإضافة الفريق ثم ارجع لهذه اللوحة.
          </p>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-secondary)]">
                <th className="sticky start-0 z-10 min-w-[140px] bg-[var(--color-bg-surface)] p-3.5 text-right font-semibold text-[var(--color-text-primary)] sm:p-4">
                  اليوم / التاريخ
                </th>
                {employees.map((e) => (
                  <th key={e.id} className="p-3.5 text-center font-semibold whitespace-nowrap text-[var(--color-text-primary)] sm:p-4">
                    {e.name}
                  </th>
                ))}
                <th className="p-3.5 text-center font-semibold text-[var(--color-success)] sm:p-4">مجموع اليوم</th>
              </tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((rowLabel, idx) => {
                const rowDate = getRowDateForWeekRow(weekStart, rowLabel)
                const rowDateStr = toYmd(rowDate)
                const isFriday = rowLabel === 'الجمعة'
                const isWedNight = rowLabel === 'سهرة الأربعاء'
                const rowBg = isWedNight
                  ? 'bg-[var(--color-gold-bg)]/50'
                  : isFriday
                    ? 'bg-[var(--color-purple-bg)]/60'
                    : idx % 2 === 0
                      ? 'bg-[var(--color-bg-base)]'
                      : ''

                let daySum = 0
                const cells = employees.map((e) => {
                  const att = findAttendanceCell(attendance, e.id, wsStr, rowLabel, rowDateStr)
                  if (att?.daily_wage != null) daySum += att.daily_wage
                  const absent = !att && !isFriday && !isWedNight
                  return { att, absent }
                })

                return (
                  <tr
                    key={rowLabel}
                    className={cn(
                      'border-b border-[var(--color-border)]/80 transition-colors hover:bg-[var(--color-bg-surface)]/40',
                      rowBg
                    )}
                  >
                    <td
                      className={cn(
                        'sticky start-0 z-10 border-[var(--color-border)] border-e bg-app-card/98 p-3.5 text-right font-semibold backdrop-blur-sm sm:p-4',
                        isWedNight && 'text-[var(--color-gold)]',
                        isFriday && 'text-[var(--color-purple)]'
                      )}
                    >
                      {rowLabel}
                      {isWedNight ? <Star className="ms-1 inline h-4 w-4 text-[var(--color-gold)]" /> : null}
                      <div className="font-mono-nums text-xs font-normal text-[var(--color-accent-blue)]" dir="ltr">
                        {formatDateEn(rowDate)}
                      </div>
                    </td>
                    {cells.map(({ att, absent }, i) => (
                      <td key={employees[i].id} className="p-3.5 text-center align-middle font-mono-nums sm:p-4">
                        {att?.daily_wage != null ? (
                          <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-lg bg-[var(--color-success-bg)] px-2 py-1 text-sm font-bold text-[var(--color-success)]">
                            {roundDisplay(att.daily_wage)}
                          </span>
                        ) : absent ? (
                          <span className="inline-block min-w-[3.5rem] rounded-lg border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger)]">
                            غياب
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                    ))}
                    <td className="p-3.5 text-center align-middle font-mono-nums font-bold text-[var(--color-accent-blue)] sm:p-4">
                      {daySum > 0 ? roundDisplay(daySum) : '—'}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-[var(--color-border)] bg-[var(--color-success-bg)]/45 font-bold text-[var(--color-text-primary)]">
                <td className="sticky start-0 z-10 border-[var(--color-border)] border-e bg-[var(--color-success-bg)]/55 p-3.5 text-right backdrop-blur-sm sm:p-4">
                  مجموع الأسبوع
                </td>
                {employees.map((e) => {
                  const sum = attendance
                    .filter((a) => a.employee_id === e.id && a.week_start_date === wsStr)
                    .reduce((s, a) => s + (a.daily_wage ?? 0), 0)
                  return (
                    <td key={e.id} className="p-3.5 text-center align-middle font-mono-nums sm:p-4">
                      {roundDisplay(sum)}
                    </td>
                  )
                })}
                <td className="p-3.5 text-center align-middle font-mono-nums text-[var(--color-success)] sm:p-4">
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
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-app-card shadow-sm">
          {employees.length === 0 ? (
            <p className="p-6 text-center text-[var(--color-text-secondary)]">أضف موظفين أولاً لعرض التفاصيل.</p>
          ) : (
            <table className="w-full border-collapse text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-surface)] text-sm text-[var(--color-text-secondary)]">
                  <th className="w-12 p-3.5 text-center sm:p-4" />
                  <th className="p-3.5 text-right font-semibold text-[var(--color-text-primary)] sm:p-4">الموظف</th>
                  <th className="p-3.5 text-center font-mono-nums font-semibold text-[var(--color-text-primary)] sm:p-4">
                    حضور
                  </th>
                  <th className="p-3.5 text-center font-mono-nums font-semibold text-[var(--color-text-primary)] sm:p-4">
                    مغادرة
                  </th>
                  <th className="p-3.5 text-center font-mono-nums font-semibold text-[var(--color-text-primary)] sm:p-4">
                    اليومية
                  </th>
                  <th className="p-3.5 text-center font-mono-nums font-semibold text-[var(--color-text-primary)] sm:p-4">
                    اليوم
                  </th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map(({ employee: e, att }, idx) => {
                  const baseDaily = e.hourly_rate * 8
                  const sel = selectedIds.has(e.id)
                  const absent = !detailIsFriday && !att
                  return (
                    <tr
                      key={e.id}
                      className={cn(
                        'border-b border-[var(--color-border)]/80 transition-colors hover:bg-[var(--color-bg-surface)]/35',
                        idx % 2 === 0 && 'bg-[var(--color-bg-base)]/80',
                        sel && att && 'bg-[var(--color-accent-blue-bg)]/55'
                      )}
                    >
                      <td className="p-3.5 text-center align-middle sm:p-4">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleSel(e.id)}
                          disabled={!att}
                          className="h-4 w-4 accent-[var(--color-success)] disabled:opacity-40"
                        />
                      </td>
                      <td className="p-3.5 text-right font-semibold text-[var(--color-text-primary)] sm:p-4">{e.name}</td>
                      <td className="p-3.5 text-center align-middle font-mono-nums sm:p-4">
                        {detailIsFriday ? (
                          '—'
                        ) : absent ? (
                          <span className="inline-block rounded-md border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-danger)]">
                            غياب
                          </span>
                        ) : (
                          formatTime12From24(att!.check_in)
                        )}
                      </td>
                      <td className="p-3.5 text-center align-middle font-mono-nums sm:p-4">
                        {detailIsFriday ? '—' : absent ? '—' : formatTime12From24(att!.check_out)}
                      </td>
                      <td className="p-3.5 text-center align-middle font-mono-nums text-[var(--color-text-secondary)] sm:p-4">
                        {detailIsFriday ? '—' : absent ? '—' : roundDisplay(baseDaily)}
                      </td>
                      <td
                        className={cn(
                          'p-3.5 text-center align-middle font-mono-nums font-bold sm:p-4',
                          absent ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'
                        )}
                      >
                        {detailIsFriday
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
        <div className="rounded-xl border border-[var(--color-success-bg)] bg-[var(--color-success-bg)]/50 px-4 py-3.5 text-[var(--color-success)] shadow-sm sm:px-5">
          المحدد ({selectedIds.size}): د.أ{' '}
          <span className="font-mono-nums font-bold text-[var(--color-text-primary)]">{roundDisplay(selectedSum)}</span>
        </div>
      </section>
    </Layout>
  )
}

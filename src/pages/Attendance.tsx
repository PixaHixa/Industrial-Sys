import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { WeekPicker } from '@/components/attendance/WeekPicker'
import { AttendanceTable } from '@/components/attendance/AttendanceTable'
import { AttendanceModal } from '@/components/attendance/AttendanceModal'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { getWeekStart, getWeekEnd } from '@/lib/weekUtils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { parseAttendance, parseEmployee, type Attendance, type Employee } from '@/types'
import { deleteAttendanceById, deleteWeekForEmployee } from '@/lib/attendanceOps'
import { useToast } from '@/contexts/ToastContext'
import { formatDateEn, toYmd } from '@/lib/format'
import type { WeekDayLabel } from '@/lib/weekUtils'
import { Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFridayAttendance } from '@/contexts/FridayAttendanceContext'
import { cn } from '@/lib/utils'

export function AttendancePage() {
  const toast = useToast()
  const { fridayAttendanceEnabled, setFridayAttendanceEnabled } = useFridayAttendance()
  const [weekRef, setWeekRef] = useState(() => getWeekStart(new Date()))
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empId, setEmpId] = useState<string>('')
  const [rows, setRows] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalCtx, setModalCtx] = useState<{
    rowLabel: WeekDayLabel
    rowDate: Date
    existing?: Attendance
  } | null>(null)

  const [delAtt, setDelAtt] = useState<Attendance | null>(null)
  const [delWeekOpen, setDelWeekOpen] = useState(false)

  const weekStart = getWeekStart(weekRef)
  const wsStr = toYmd(weekStart)
  const selectedEmployee = employees.find((e) => e.id === empId) ?? null

  const loadEmployees = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setEmployees([])
      return
    }
    const { data, error } = await supabase.from('employees').select('*').order('employee_id')
    if (error) {
      console.error(error)
      setEmployees([])
      return
    }
    const list = (data ?? []).map(parseEmployee)
    setEmployees(list)
    setEmpId((prev) => {
      if (prev && list.some((e) => e.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  const loadRows = useCallback(async () => {
    if (!isSupabaseConfigured() || !empId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empId)
        .eq('week_start_date', wsStr)
      if (error) throw error
      setRows((data ?? []).map(parseAttendance))
    } catch (e) {
      console.error(e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [empId, wsStr])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const weekRangeLabel = useMemo(() => {
    const end = getWeekEnd(weekStart)
    return `${formatDateEn(weekStart)} — ${formatDateEn(end)}`
  }, [weekStart])

  async function confirmDeleteWeek() {
    if (!selectedEmployee) return
    try {
      await deleteWeekForEmployee(selectedEmployee.id, weekStart)
      toast.success()
      void loadRows()
    } catch (e) {
      console.error(e)
      toast.error()
    }
  }

  async function confirmDeleteRow() {
    if (!delAtt) return
    try {
      await deleteAttendanceById(delAtt.id)
      toast.success()
      setDelAtt(null)
      void loadRows()
    } catch (e) {
      console.error(e)
      toast.error()
    }
  }

  return (
    <Layout weekReference={weekStart}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-right">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">الدوام</h2>
        <div className="flex flex-wrap items-center gap-3">
          <WeekPicker value={weekRef} onChange={(d) => setWeekRef(d)} />
          <Button
            variant="danger"
            disabled={!selectedEmployee}
            onClick={() => setDelWeekOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> حذف أسبوع
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">اختر موظف</label>
        <select
          className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-app-card px-4 py-3 font-semibold text-[var(--color-text-primary)] shadow-sm outline-none transition-colors focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[var(--color-accent-blue)]/25"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employee_id})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-right shadow-sm sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">دوام يوم الجمعة (لجميع الموظفين)</p>
            <p className="mt-1 text-sm text-slate-600">
              <strong className="text-slate-800">إيقاف:</strong> لا زر «إضافة» للجمعة ولا يُحسب غياب يوم الجمعة.
              <span className="mx-1">—</span>
              <strong className="text-slate-800">تشغيل:</strong> يظهر «إضافة» ليوم الجمعة ويُحسب الغياب كباقي الأيام.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              {fridayAttendanceEnabled ? 'تشغيل' : 'إيقاف'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={fridayAttendanceEnabled}
              aria-label={fridayAttendanceEnabled ? 'إيقاف دوام الجمعة' : 'تشغيل دوام الجمعة'}
              onClick={() => setFridayAttendanceEnabled(!fridayAttendanceEnabled)}
              className={cn(
                'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500',
                fridayAttendanceEnabled ? 'bg-slate-700' : 'bg-slate-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all duration-200 ease-out',
                  fridayAttendanceEnabled ? 'inset-inline-end-1' : 'inset-inline-start-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      ) : !selectedEmployee ? (
        <p className="text-[var(--color-text-secondary)]">لا يوجد موظفون.</p>
      ) : (
        <AttendanceTable
          employee={selectedEmployee}
          weekStart={weekStart}
          rows={rows}
          onAdd={(rowLabel, rowDate) => {
            setModalCtx({ rowLabel, rowDate })
            setModalOpen(true)
          }}
          onEdit={(rowLabel, rowDate, att) => {
            setModalCtx({ rowLabel, rowDate, existing: att })
            setModalOpen(true)
          }}
          onDeleteRow={(att) => setDelAtt(att)}
        />
      )}

      <AttendanceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalCtx(null)
        }}
        employee={selectedEmployee}
        rowDate={modalCtx?.rowDate ?? weekStart}
        weekStart={weekStart}
        rowLabel={modalCtx?.rowLabel ?? 'الخميس'}
        existingId={modalCtx?.existing?.id}
        initialCheckIn={modalCtx?.existing?.check_in}
        initialCheckOut={modalCtx?.existing?.check_out}
        onSaved={() => void loadRows()}
      />

      <ConfirmModal
        open={!!delAtt}
        onClose={() => setDelAtt(null)}
        title="تأكيد الحذف"
        message={
          delAtt
            ? 'هل تريد حذف دوام ' +
              delAtt.day_of_week +
              ' ليوم ' +
              formatDateEn(new Date(delAtt.date + 'T12:00:00')) +
              '\u061F'
            : ''
        }
        danger
        confirmLabel="حذف"
        onConfirm={confirmDeleteRow}
      />

      <ConfirmModal
        open={delWeekOpen}
        onClose={() => setDelWeekOpen(false)}
        title="تأكيد حذف الأسبوع"
        message={
          selectedEmployee
            ? 'هل تريد حذف كامل أسبوع ' +
              weekRangeLabel +
              ' للموظف ' +
              selectedEmployee.name +
              '\u061F لن يؤثر على الأسابيع الأخرى.'
            : ''
        }
        danger
        confirmLabel="حذف الأسبوع"
        onConfirm={confirmDeleteWeek}
      />
    </Layout>
  )
}

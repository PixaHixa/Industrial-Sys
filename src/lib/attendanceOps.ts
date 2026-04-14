import { calculateDailyWage, getWednesdayCarryOver } from '@/lib/calculations'
import { getCarryOverDate, getWeekStart } from '@/lib/weekUtils'
import { fromDbTime, toDbTime } from '@/lib/timeFormat'
import { supabase } from '@/lib/supabase'
import { addDays, format, parse } from 'date-fns'
import type { Employee } from '@/types'
import type { WeekDayLabel } from '@/lib/weekUtils'

export type SaveAttendanceInput = {
  employee: Employee
  /** تاريخ الصف في الجدول */
  rowDate: Date
  weekStart: Date
  rowLabel: WeekDayLabel
  checkIn24: string
  checkOut24: string
  existingId?: string
}

function fmt(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

/** يطابق حد DECIMAL(10,6) في Postgres دون تغيير منطق الحساب */
function forDbDecimal(n: number): number {
  return Math.round(n * 1e6) / 1e6
}

/** حذف ترحيل مرتبط بأربعاء محددة (نفس الموظف، الأسبوع التالي) */
async function deleteCarryForWednesday(employeeId: string, wednesdayDate: Date) {
  const nextWeekStart = addDays(getWeekStart(wednesdayDate), 7)
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('employee_id', employeeId)
    .eq('week_start_date', fmt(nextWeekStart))
    .eq('is_carried_over', true)
    .eq('date', fmt(wednesdayDate))
  if (error) throw error
}

export async function saveAttendanceRecord(input: SaveAttendanceInput) {
  const { employee, rowDate, weekStart, rowLabel, checkIn24, checkOut24, existingId } = input
  if (rowLabel === 'سهرة الأربعاء') {
    throw new Error('لا يمكن إضافة دوام يدوي لصف سهرة الأربعاء')
  }

  const weekStartStr = fmt(weekStart)
  const dateStr = fmt(rowDate)
  const arabicDay =
    rowLabel === 'الجمعة'
      ? 'الجمعة'
      : rowLabel === 'الخميس'
        ? 'الخميس'
        : rowLabel === 'السبت'
          ? 'السبت'
          : rowLabel === 'الأحد'
            ? 'الأحد'
            : rowLabel === 'الاثنين'
              ? 'الاثنين'
              : rowLabel === 'الثلاثاء'
                ? 'الثلاثاء'
                : 'الأربعاء'

  const cin = fromDbTime(toDbTime(checkIn24))
  const cout = fromDbTime(toDbTime(checkOut24))
  const rate = employee.hourly_rate
  const transport = employee.transport_allowance

  const wageCalc = calculateDailyWage({
    checkIn: cin,
    checkOut: cout,
    hourlyRate: rate,
    transportAllowance: transport,
    dayOfWeek: arabicDay,
  })
  const hoursWorked = forDbDecimal(wageCalc.hoursWorked)
  const overtime = forDbDecimal(wageCalc.overtimeHours)

  let dailyWage: number
  let carriedOver = 0

  if (arabicDay === 'الأربعاء') {
    const split = getWednesdayCarryOver({
      totalWage: wageCalc.dailyWage,
      hourlyRate: rate,
      transportAllowance: transport,
    })
    dailyWage = forDbDecimal(split.wednesdayWage)
    carriedOver = forDbDecimal(split.carriedAmount)
  } else {
    dailyWage = forDbDecimal(wageCalc.dailyWage)
  }

  const payload = {
    employee_id: employee.id,
    date: dateStr,
    day_of_week: arabicDay,
    check_in: toDbTime(checkIn24),
    check_out: toDbTime(checkOut24),
    hours_worked: hoursWorked,
    overtime_hours: overtime,
    daily_wage: dailyWage,
    is_carried_over: false,
    carried_over_amount: 0,
    week_start_date: weekStartStr,
  }

  let newRowId: string | undefined

  if (existingId) {
    const { error } = await supabase.from('attendance').update(payload).eq('id', existingId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('attendance').insert(payload).select('id').maybeSingle()
    if (error) throw error
    newRowId = data?.id
  }

  if (arabicDay === 'الأربعاء') {
    await deleteCarryForWednesday(employee.id, rowDate)
    if (carriedOver > 1e-5) {
      const nextWeekStart = addDays(weekStart, 7)
      const carryDate = getCarryOverDate(nextWeekStart)
      /** قيم وقت وهمية — قد يفرض Postgres NOT NULL على check_in/check_out؛ الواجهة تعرض «—» لصف الترحيل */
      const carryPayload = {
        employee_id: employee.id,
        date: fmt(carryDate),
        day_of_week: 'سهرة الأربعاء',
        check_in: '00:00:00',
        check_out: '00:00:00',
        hours_worked: 0,
        overtime_hours: 0,
        daily_wage: forDbDecimal(carriedOver),
        is_carried_over: true,
        carried_over_amount: forDbDecimal(carriedOver),
        week_start_date: fmt(nextWeekStart),
      }
      const { error: carryErr } = await supabase.from('attendance').insert(carryPayload)
      if (carryErr) {
        if (newRowId) {
          await supabase.from('attendance').delete().eq('id', newRowId)
        }
        const hint =
          carryErr.code === '23505'
            ? ' (قد يوجد قيد UNIQUE على الموظف+التاريخ فقط — شغّل ملف supabase/migrations/fix_attendance_unique.sql)'
            : ''
        throw new Error((carryErr.message || 'فشل حفظ الترحيل لسهرة الأربعاء') + hint)
      }
    }
  }
}

export async function deleteAttendanceById(id: string) {
  const { data: row } = await supabase.from('attendance').select('*').eq('id', id).maybeSingle()
  if (row && !row.is_carried_over && row.day_of_week === 'الأربعاء' && row.date) {
    await deleteCarryForWednesday(row.employee_id, parse(row.date, 'yyyy-MM-dd', new Date()))
  }
  const { error } = await supabase.from('attendance').delete().eq('id', id)
  if (error) throw error
}

export async function deleteWeekForEmployee(employeeId: string, weekStart: Date) {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('employee_id', employeeId)
    .eq('week_start_date', fmt(weekStart))
  if (error) throw error
}

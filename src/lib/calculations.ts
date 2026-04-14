/**
 * فرق الساعات بين حضور ومغادرة بصيغة "HH:MM" أو "HH:MM:SS" (24 ساعة).
 * إذا كانت المغادرة قبل منتصف الليل والحضور بعد الظهر تُحسب عبر منتصف الليل.
 */
export function timeDiffHours(checkIn: string, checkOut: string): number {
  const parse = (t: string) => {
    const [h, m] = t.trim().split(':').map(Number)
    return h * 60 + (m || 0)
  }
  const inMinutes = parse(checkIn)
  const outMinutes = parse(checkOut)
  const diffMinutes =
    outMinutes >= inMinutes ? outMinutes - inMinutes : 24 * 60 - inMinutes + outMinutes
  return diffMinutes / 60
}

export type DailyWageResult = {
  hoursWorked: number
  overtimeHours: number
  baseWage: number
  dailyWage: number
}

/** حساب الراتب اليومي — dayOfWeek بالعربي */
export function calculateDailyWage(params: {
  checkIn: string
  checkOut: string
  hourlyRate: number
  transportAllowance: number
  dayOfWeek: string
}): DailyWageResult {
  const { checkIn, checkOut, hourlyRate, transportAllowance, dayOfWeek } = params

  const totalHours = timeDiffHours(checkIn, checkOut)
  const hoursWorked = totalHours - 1

  let baseWage: number
  let overtimeHours = 0

  if (dayOfWeek === 'الجمعة') {
    baseWage = hoursWorked * hourlyRate * 1.5
    overtimeHours = 0
  } else {
    if (hoursWorked <= 8) {
      baseWage = hoursWorked * hourlyRate
      overtimeHours = 0
    } else {
      overtimeHours = hoursWorked - 8
      baseWage = 8 * hourlyRate + overtimeHours * hourlyRate * 1.112
    }
  }

  const dailyWage = baseWage + transportAllowance

  return { hoursWorked, overtimeHours, baseWage, dailyWage }
}

export function getWednesdayCarryOver(params: {
  totalWage: number
  hourlyRate: number
  transportAllowance: number
}): {
  hasCarryOver: boolean
  wednesdayWage: number
  carriedAmount: number
} {
  const { totalWage, hourlyRate, transportAllowance } = params
  const baseDaily = hourlyRate * 8 + transportAllowance

  if (totalWage > baseDaily) {
    return {
      hasCarryOver: true,
      wednesdayWage: baseDaily,
      carriedAmount: totalWage - baseDaily,
    }
  }

  return {
    hasCarryOver: false,
    wednesdayWage: totalWage,
    carriedAmount: 0,
  }
}

/** للتوافق مع الكود السابق */
export function calculateOvertimeHours(hoursWorked: number): number {
  return hoursWorked - 8
}

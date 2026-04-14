import { format } from 'date-fns'

/** تاريخ قصير للمقارنة مع قاعدة البيانات */
export function toYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** عرض التاريخ للمستخدم: DD/MM/YYYY (أرقام إنجليزية عبر صيغة date-fns) */
export function formatDateEn(d: Date): string {
  return format(d, 'dd/MM/yyyy')
}

export function formatMoneyDisplay(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** تقريب للعرض فقط — منزلتان عشريتان */
export function roundDisplay(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2)
}

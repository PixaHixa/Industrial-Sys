import { cn } from '@/lib/utils'

/** غلاف الجدول */
export const tableShellClass =
  'overflow-x-auto rounded-xl border border-slate-300/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]'

export const tableBaseClass =
  'w-full border-collapse text-[15px] leading-relaxed text-slate-900 [font-feature-settings:normal]'

/** صف جسم تفاعلي — hover يغيّر لون كل الخلايا */
export const tableRowGroup = 'group/row transition-[background-color] duration-150 ease-out'

/** خلفية الصف + hover بارز (رمادي واضح) */
export function tableRowCell(zebraEven: boolean) {
  return cn(
    'border-b border-b-slate-200 border-e border-e-slate-200/70 px-4 py-3.5 align-middle transition-colors duration-150 sm:px-5 sm:py-4',
    zebraEven ? 'bg-white' : 'bg-slate-50',
    'group-hover/row:bg-slate-200'
  )
}

export const tableHeadCell =
  'border-b-2 border-b-slate-400 border-e border-e-slate-200/80 bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900 sm:px-5 sm:py-4 sm:text-base'

export const tableHeadSticky =
  'sticky top-0 z-20 bg-slate-100 shadow-[0_1px_0_0_rgb(148,163,184)]'

export const tableCellLast = 'border-e-0'

/** صف إجمالي / تذييل — بدون hover صف كامل */
export const tableTotalRow = 'bg-slate-300/40 text-slate-900'

export function tableTotalCell(extra?: string) {
  return cn(
    'border-b border-b-slate-300/80 border-e border-e-slate-300/60 bg-slate-300/35 px-4 py-3.5 font-bold sm:px-5 sm:py-4',
    extra
  )
}

export const numNeutral = 'font-mono-nums font-semibold tabular-nums tracking-tight text-slate-800'

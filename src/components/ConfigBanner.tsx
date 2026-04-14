import { isSupabaseConfigured } from '@/lib/supabase'

export function ConfigBanner() {
  if (isSupabaseConfigured()) return null
  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 sm:px-6"
      dir="rtl"
    >
      أضف المتغيرات <span className="font-mono-nums">VITE_SUPABASE_URL</span> و{' '}
      <span className="font-mono-nums">VITE_SUPABASE_ANON_KEY</span> في ملف{' '}
      <span className="font-mono-nums">.env</span> ثم أعد تشغيل الخادم.
    </div>
  )
}

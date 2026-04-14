import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

type LayoutProps = {
  children: ReactNode
  weekReference: Date
}

export function Layout({ children, weekReference }: LayoutProps) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-app-bg" dir="rtl">
      <Header weekReference={weekReference} />
      {/* صف باتجاه LTR صراحةً حتى لا يُورّث rtl فيضع الشريط يساراً */}
      <div className="flex min-h-0 flex-1 flex-row" dir="ltr">
        <main className="min-w-0 flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 animate-fade-in" dir="rtl">
          {children}
        </main>
        <Sidebar weekStart={weekReference} />
      </div>
    </div>
  )
}

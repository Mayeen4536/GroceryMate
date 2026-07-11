import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { PageId } from '../../lib/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

/**
 * Application chrome: desktop sidebar (collapsible), mobile top bar and
 * floating dock, and the main content container. Pages render as children.
 */
export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lifted"
      >
        Skip to content
      </a>
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <TopBar />
      <div
        className={cn(
          'transition-[padding] duration-300 ease-soft',
          sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-60',
        )}
      >
        <main
          id="main"
          className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-12"
        >
          {children}
        </main>
      </div>
      <BottomNav activePage={activePage} onNavigate={onNavigate} />
    </div>
  )
}

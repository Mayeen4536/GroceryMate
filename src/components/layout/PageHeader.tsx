import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { SectionHeader } from '../ui'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Slot for page-level actions (usually a Button). */
  action?: ReactNode
}

/** Standard header at the top of every page: h1 title, description, action slot. */
export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <SectionHeader
      level={1}
      title={title}
      description={description}
      icon={icon}
      action={action}
      className="mb-8"
    />
  )
}

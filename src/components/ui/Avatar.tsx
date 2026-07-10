import { cn } from '../../lib/cn'

type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  /** Full name; initials and accent color are derived from it. */
  name: string
  size?: AvatarSize
  /** Pin a specific member accent (index into the palette) instead of deriving one from the name. */
  tone?: number
  className?: string
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-8 text-[0.6875rem]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

const memberTones = [
  'bg-member-coral-soft text-member-coral-strong',
  'bg-member-sky-soft text-member-sky-strong',
  'bg-member-violet-soft text-member-violet-strong',
  'bg-member-gold-soft text-member-gold-strong',
  'bg-member-rose-soft text-member-rose-strong',
  'bg-member-teal-soft text-member-teal-strong',
] as const

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

function hashOf(name: string): number {
  let hash = 0
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return hash
}

export function Avatar({ name, size = 'md', tone, className }: AvatarProps) {
  const toneClass = memberTones[(tone ?? hashOf(name)) % memberTones.length]
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-surface',
        sizeClasses[size],
        toneClass,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

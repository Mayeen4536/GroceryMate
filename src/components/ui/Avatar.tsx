import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { springSnappy } from '../../lib/motion'

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

export interface MemberTone {
  /** Soft background + readable text, used by the avatar itself. */
  chip: string
  /** Solid dot for color pickers. */
  dot: string
  /** Low-opacity wash for card accents. */
  glow: string
}

/** The member accent palette. Index order is stable; persisted tones rely on it. */
export const MEMBER_TONES: MemberTone[] = [
  {
    chip: 'bg-member-coral-soft text-member-coral-strong',
    dot: 'bg-member-coral-strong',
    glow: 'bg-member-coral-strong/10',
  },
  {
    chip: 'bg-member-sky-soft text-member-sky-strong',
    dot: 'bg-member-sky-strong',
    glow: 'bg-member-sky-strong/10',
  },
  {
    chip: 'bg-member-violet-soft text-member-violet-strong',
    dot: 'bg-member-violet-strong',
    glow: 'bg-member-violet-strong/10',
  },
  {
    chip: 'bg-member-gold-soft text-member-gold-strong',
    dot: 'bg-member-gold-strong',
    glow: 'bg-member-gold-strong/10',
  },
  {
    chip: 'bg-member-rose-soft text-member-rose-strong',
    dot: 'bg-member-rose-strong',
    glow: 'bg-member-rose-strong/10',
  },
  {
    chip: 'bg-member-teal-soft text-member-teal-strong',
    dot: 'bg-member-teal-strong',
    glow: 'bg-member-teal-strong/10',
  },
]

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
  const toneClass = MEMBER_TONES[(tone ?? hashOf(name)) % MEMBER_TONES.length].chip
  return (
    <motion.span
      whileHover={{ scale: 1.1, y: -2 }}
      transition={springSnappy}
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        'shadow-[inset_0_1px_1px_rgb(255_255_255/0.55),inset_0_-1px_1px_rgb(30_26_22/0.05)] ring-1 ring-ink/[0.06]',
        sizeClasses[size],
        toneClass,
        className,
      )}
    >
      {initialsOf(name)}
    </motion.span>
  )
}

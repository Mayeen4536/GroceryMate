import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { transitionFast } from '../../lib/motion'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 focus-visible:ring-brand-500/40',
  secondary:
    'border border-line bg-surface text-ink shadow-soft hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-brand-500/40',
  ghost:
    'text-ink-soft hover:bg-sand hover:text-ink focus-visible:ring-brand-500/40',
  danger:
    'bg-danger-600 text-white shadow-soft hover:bg-danger-700 focus-visible:ring-danger-500/40',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm',
  md: 'h-11 gap-2 px-5 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
}

const iconSizes: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 }

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft: IconLeft,
  iconRight: IconRight,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={transitionFast}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-semibold',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {IconLeft && <IconLeft size={iconSizes[size]} aria-hidden="true" />}
      {children}
      {IconRight && <IconRight size={iconSizes[size]} aria-hidden="true" />}
    </motion.button>
  )
}

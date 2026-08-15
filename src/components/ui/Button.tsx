import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { springSnappy } from '@/animations/motion'

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
  // Gradient starts at the 600 step, not 500: white text on brand-500/danger-500
  // measures 3.82:1, under the 4.5:1 AA text threshold. 600 clears it (5.3:1 / 5.0:1).
  primary:
    'bg-linear-to-b from-brand-600 to-brand-700 text-white shadow-button-brand hover:brightness-[1.07] focus-visible:ring-brand-500/40',
  secondary:
    'bg-surface text-ink shadow-button hover:bg-sand/70 hover:text-brand-800 focus-visible:ring-brand-500/40',
  ghost:
    'text-ink-soft hover:bg-ink/[0.05] hover:text-ink focus-visible:ring-brand-500/40',
  danger:
    'bg-linear-to-b from-danger-600 to-danger-700 text-white shadow-button-danger hover:brightness-[1.07] focus-visible:ring-danger-500/40',
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
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      className={cn(
        'group inline-flex select-none items-center justify-center rounded-md font-semibold',
        'transition-[background-color,color,filter,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {IconLeft && (
        <IconLeft
          size={iconSizes[size]}
          aria-hidden="true"
          className="transition-transform duration-200 ease-soft group-hover:scale-110"
        />
      )}
      {children}
      {IconRight && (
        <IconRight
          size={iconSizes[size]}
          aria-hidden="true"
          className="transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
        />
      )}
    </motion.button>
  )
}

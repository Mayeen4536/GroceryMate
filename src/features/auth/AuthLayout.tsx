import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '@/components/layout/Brand'
import { riseChild } from '@/animations/motion'

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

/**
 * Shared chrome for /sign-in, /sign-up, and household onboarding/fallback
 * screens: a centered card on the same warm canvas as Landing. Not
 * auth-specific despite the name/folder — reused as-is (see
 * src/household/HouseholdGate.tsx) rather than duplicated, since it has no
 * auth-only logic.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  /** e.g. "Don't have an account? Sign up" */
  footer?: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full bg-brand-300/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-24 size-[30rem] rounded-full bg-mint-200/25 blur-3xl"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-sm"
      >
        <motion.div variants={riseChild} className="mb-7 flex justify-center">
          <Link to="/" aria-label="GroceryMate home">
            <Brand withTagline />
          </Link>
        </motion.div>

        <motion.div variants={riseChild} className="card-surface shadow-panel rounded-xl p-6 sm:p-7">
          <h1 className="text-xl font-bold tracking-[-0.01em] text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.div>

        {footer && (
          <motion.p variants={riseChild} className="mt-5 text-center text-sm text-muted">
            {footer}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}

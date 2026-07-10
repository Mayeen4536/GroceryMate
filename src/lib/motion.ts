import type { Transition, Variants } from 'framer-motion'

/**
 * Shared Framer Motion presets. Keep all interaction motion subtle:
 * animate only transform and opacity, and always go through these
 * presets so timing stays consistent across the app.
 * Matches `--ease-soft` in index.css.
 */
export const easeSoft: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Micro-interactions: press feedback, hovers. */
export const transitionFast: Transition = { duration: 0.15, ease: easeSoft }

/** Standard UI transitions: reveals, small movements. */
export const transitionBase: Transition = { duration: 0.22, ease: easeSoft }

/** Larger reveals - the ceiling for UI motion. */
export const transitionSlow: Transition = { duration: 0.32, ease: easeSoft }

/** Gentle entrance for content blocks. Use once on mount, never on rerenders. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
}

/** Parent variants that stagger `fadeInUp` children. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

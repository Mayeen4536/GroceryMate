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

/** Physical feel for things that follow the pointer: nav pills, press feedback. */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 }

/** Softer spring for hover lifts and decorative movement. */
export const springGentle: Transition = { type: 'spring', stiffness: 240, damping: 26 }

/** Slight overshoot for success pops and confirmations. Subtle, never rubbery. */
export const springPop: Transition = { type: 'spring', stiffness: 560, damping: 24 }

/** Firm spring for overlay panels (modals, drawers). No visible bounce. */
export const springPanel: Transition = { type: 'spring', stiffness: 400, damping: 38 }

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

/**
 * Page-level enter/exit with a directional slide. Pass the navigation
 * direction (1 = forward, -1 = backward) via the `custom` prop on both
 * the motion element and its AnimatePresence. Pair with `riseChild` on
 * direct children for a staggered reveal.
 */
export const pageVariants: Variants = {
  hidden: (direction: number = 1) => ({ opacity: 0, x: 28 * direction }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { ...transitionBase, when: 'beforeChildren', staggerChildren: 0.05 },
  },
  exit: (direction: number = 1) => ({
    opacity: 0,
    x: -20 * direction,
    transition: { duration: 0.12, ease: easeSoft },
  }),
}

/** Child blocks inside a `pageVariants` container. */
export const riseChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: transitionBase },
}

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/cn'

const PARTICLE_COLORS = [
  'bg-brand-500',
  'bg-mint-200',
  'bg-warning-500',
  'bg-member-coral-strong',
  'bg-member-sky-strong',
  'bg-member-rose-strong',
]

interface Particle {
  id: number
  angle: number
  distance: number
  size: number
  color: string
  rotate: number
}

function makeBurst(seed: number): Particle[] {
  return Array.from({ length: 22 }, (_, index) => {
    const angle = (index / 22) * Math.PI * 2 + (((seed * 37 + index * 13) % 10) / 10) * 0.5
    return {
      id: seed * 100 + index,
      angle,
      distance: 46 + ((seed * 17 + index * 29) % 40),
      size: 4 + ((index * 7) % 5),
      color: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
      rotate: ((index * 47) % 180) - 90,
    }
  })
}

/**
 * One-shot confetti burst. Increment `trigger` to fire; the burst radiates
 * from the center of the nearest `relative` ancestor and clears itself in
 * about a second. Reserved for completed settlements; honors reduced motion.
 */
export function Celebration({ trigger }: { trigger: number }) {
  const reducedMotion = useReducedMotion()
  const [burst, setBurst] = useState<Particle[] | null>(null)

  useEffect(() => {
    if (trigger <= 0 || reducedMotion) return
    setBurst(makeBurst(trigger))
    const timer = setTimeout(() => setBurst(null), 1000)
    return () => clearTimeout(timer)
  }, [trigger, reducedMotion])

  if (!burst) return null

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {burst.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn('absolute rounded-[2px]', particle.color)}
          style={{ width: particle.size, height: particle.size * 0.6 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: Math.cos(particle.angle) * particle.distance,
            y: Math.sin(particle.angle) * particle.distance + 18,
            opacity: 0,
            rotate: particle.rotate,
            scale: 0.6,
          }}
          transition={{ duration: 0.85, ease: [0.12, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export interface FlowDotsProps {
  /** Direction of travel: 'x' runs left-to-right, 'y' runs top-to-bottom. */
  axis: 'x' | 'y'
  duration: number
  staggerDelay: number
  size?: number
  colorClassName?: string
  ease?: 'linear' | 'easeInOut'
  /** How far past each edge the dot starts/ends, as a fraction of the track (0.02 = 2%). */
  overshoot?: number
  /** Where the dot sits on the axis perpendicular to travel: the container's edge, or its middle (e.g. riding a centered guide line in a taller track). */
  crossAxisPosition?: 'start' | 'center'
}

/**
 * Three dots traveling the length of their container — the "money quietly
 * flowing" flourish used on the Landing hero, Settlements summary, and
 * settlement flow/journey visuals. Animates a pixel `x`/`y` transform
 * (measured from the container's own size via `ResizeObserver`) instead of
 * `left`/`top`, so it never triggers layout on every frame and correctly
 * stops under `prefers-reduced-motion` — `MotionConfig`'s
 * `reducedMotion="user"` only recognizes transform props, not raw
 * `left`/`top`/`width`/`height`.
 *
 * Drop directly inside a `relative overflow-hidden` container; it fills
 * that container (`absolute inset-0`) and positions dots relative to it.
 */
export function FlowDots({
  axis,
  duration,
  staggerDelay,
  size = 3,
  colorClassName = 'bg-brand-400',
  ease = 'linear',
  overshoot = 0.02,
  crossAxisPosition = 'start',
}: FlowDotsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [trackLength, setTrackLength] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setTrackLength(axis === 'x' ? el.offsetWidth : el.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [axis])

  const from = -trackLength * overshoot
  const to = trackLength * (1 + overshoot)

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className={`absolute rounded-full ${colorClassName}`}
          style={{
            top: axis === 'x' && crossAxisPosition === 'center' ? '50%' : 0,
            left: axis === 'y' ? '50%' : 0,
            width: size,
            height: size,
            // Centers the dot on the guide line perpendicular to its travel
            // axis — vertically for a horizontal traveler, horizontally for
            // a vertical one. No margin on the travel axis itself: its
            // static base (top/left above) plus the animated x/y transform
            // together are the dot's actual position.
            marginTop: axis === 'x' ? -size / 2 : 0,
            marginLeft: axis === 'y' ? -size / 2 : 0,
          }}
          initial={{ [axis]: from, opacity: 0 }}
          animate={trackLength > 0 ? { [axis]: [from, to], opacity: [0, 1, 1, 0] } : undefined}
          transition={{ duration, delay: index * staggerDelay, repeat: Infinity, ease }}
        />
      ))}
    </div>
  )
}

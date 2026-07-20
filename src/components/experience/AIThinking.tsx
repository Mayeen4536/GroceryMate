import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

/**
 * The brief "reading your request" beat before the concrete generation
 * steps begin. A dedicated experience piece, so the ambient loop is
 * sanctioned: a pulsing glow, a slowly turning sparkle, and a typing-style
 * dot wave under the label.
 */
export function AIThinking({ label = 'Thinking…' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-8">
      <div className="relative flex size-16 items-center justify-center">
        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-linear-to-br from-brand-400/40 to-mint-200/40 blur-md"
        />
        <motion.span
          aria-hidden="true"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          className="relative flex size-11 items-center justify-center rounded-full bg-linear-to-br from-brand-100 to-mint-100 text-brand-700 shadow-card ring-1 ring-ink/5"
        >
          <Sparkles size={20} aria-hidden="true" />
        </motion.span>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="size-1.5 rounded-full bg-brand-500"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.15,
              }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

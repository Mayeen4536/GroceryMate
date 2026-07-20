import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { springSnappy } from '../../lib/motion'
import { EXAMPLE_PROMPTS } from '../../data/assistant'

/** Quick-fill chips: click one to drop it straight into the prompt box. */
export function ExamplePrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">Try</span>
      {EXAMPLE_PROMPTS.map((prompt) => (
        <motion.button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={springSnappy}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-ink-soft shadow-soft ring-1 ring-line transition-colors hover:text-brand-800 hover:ring-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <Sparkles size={12} aria-hidden="true" className="text-brand-600" />
          {prompt}
        </motion.button>
      ))}
    </div>
  )
}

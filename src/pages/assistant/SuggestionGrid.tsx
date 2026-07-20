import { motion } from 'framer-motion'
import { Card } from '../../components/ui'
import { riseChild, staggerChildren } from '../../lib/motion'
import { SUGGESTIONS, type SuggestionKind } from '../../data/assistant'

/** Four cards, one per way to talk to the assistant; each routes to its matching input. */
export function SuggestionGrid({ onSelect }: { onSelect: (kind: SuggestionKind) => void }) {
  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2"
    >
      {SUGGESTIONS.map((suggestion) => (
        <motion.div key={suggestion.kind} variants={riseChild}>
          <Card
            variant="interactive"
            icon={suggestion.icon}
            accent={suggestion.accent}
            title={suggestion.title}
            subtitle={suggestion.description}
            onClick={() => onSelect(suggestion.kind)}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

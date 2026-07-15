import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBasket } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { Celebration } from '../../components/experience'
import { springPop } from '../../lib/motion'

/** The everyone-is-square state. Confetti fires once on arrival. */
export function AllSettled({ onAddGroceries }: { onAddGroceries: () => void }) {
  const [burst, setBurst] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setBurst(1), 350)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card padding="none" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-28 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-brand-500/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
        <div className="relative">
          <Celebration trigger={burst} />
          <motion.span
            role="img"
            aria-label="Party popper"
            initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ ...springPop, delay: 0.15 }}
            className="block text-6xl"
          >
            🎉
          </motion.span>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-ink">Everyone's square.</h2>
          <p className="text-sm text-muted">Time to buy more groceries.</p>
        </div>
        <Button iconLeft={ShoppingBasket} onClick={onAddGroceries}>
          Go to groceries
        </Button>
      </div>
    </Card>
  )
}

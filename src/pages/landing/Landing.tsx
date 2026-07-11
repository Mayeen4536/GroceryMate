import { motion, type Variants } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
import { Avatar, Badge, Button } from '../../components/ui'
import { Brand } from '../../components/layout/Brand'
import { cn } from '../../lib/cn'
import { riseChild, springGentle } from '../../lib/motion'
import { mockMembers } from '../../data/mock'
import { HeroMockup } from './HeroMockup'
import { HowItWorks } from './HowItWorks'

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

/** Slow-drifting gradient blobs behind the hero. Transform-only, GPU friendly. */
function GradientField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-40 size-[34rem] rounded-full bg-brand-300/30 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-40 top-24 size-[30rem] rounded-full bg-mint-200/40 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/3 top-[38rem] size-[26rem] rounded-full bg-warning-50 opacity-70 blur-3xl"
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/** The primary CTA: glow, lift, sliding arrow, and a morphing gradient on hover. */
function HeroCta({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={springGentle}
      className={cn(
        'group relative inline-flex h-12 items-center gap-2 rounded-lg px-7 text-base font-semibold text-white',
        'bg-linear-to-r from-brand-600 via-brand-500 to-brand-700 bg-[length:200%_100%] bg-left hover:bg-right',
        'shadow-button-brand hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_2px_4px_rgb(16_58_38/0.3),0_10px_32px_-6px_rgb(33_122_80/0.65)]',
        'transition-[background-position,box-shadow] duration-500 ease-soft',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
      )}
    >
      Start splitting fairly
      <ArrowRight
        size={18}
        aria-hidden="true"
        className="transition-transform duration-300 ease-soft group-hover:translate-x-1"
      />
    </motion.button>
  )
}

/** Marketing landing page. Everything here is presentation; `onEnter` opens the app. */
export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <GradientField />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Button variant="ghost" size="sm" onClick={onEnter}>
          Open the app
        </Button>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-6xl gap-16 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pb-32 lg:pt-16">
          <motion.div variants={heroStagger} initial="hidden" animate="visible">
            <motion.div variants={riseChild}>
              <Badge tone="mint" icon={Sparkles}>
                Fair by default
              </Badge>
            </motion.div>
            <motion.h1
              variants={riseChild}
              className="mt-5 text-[2.6rem] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-6xl"
            >
              Split groceries fairly.
              <br />
              <span className="bg-linear-to-r from-brand-600 to-member-teal-strong bg-clip-text text-transparent">
                Keep living simple.
              </span>
            </motion.h1>
            <motion.p variants={riseChild} className="mt-6 max-w-md text-lg text-muted">
              Add what you buy, tag who shares it, and GroceryMate works out exactly who owes
              whom. No spreadsheets. No awkward reminders. Just even.
            </motion.p>
            <motion.div variants={riseChild} className="mt-9 flex flex-wrap items-center gap-3">
              <HeroCta onClick={onEnter} />
              <a
                href="#how-it-works"
                className="group inline-flex h-12 items-center gap-1.5 rounded-lg px-4 text-base font-medium text-ink-soft transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                See how it works
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-soft group-hover:translate-y-0.5"
                />
              </a>
            </motion.div>
            <motion.div variants={riseChild} className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                {mockMembers.map((name) => (
                  <Avatar key={name} name={name} size="sm" className="ring-2 ring-canvas" />
                ))}
              </div>
              <p className="text-sm text-muted">
                Built for flatmates, hostels, and every shared home.
              </p>
            </motion.div>
          </motion.div>

          <HeroMockup />
        </section>

        <HowItWorks />
      </main>

      <footer className="relative z-10 border-t border-line py-10">
        <div className="flex flex-col items-center gap-2.5">
          <Brand />
          <p className="text-sm text-muted">Split groceries fairly. Keep living simple.</p>
        </div>
      </footer>
    </div>
  )
}

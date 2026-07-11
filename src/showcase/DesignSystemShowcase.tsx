import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, Reorder, motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  GripVertical,
  HandCoins,
  Heart,
  History,
  Leaf,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react'
import {
  AnimatedNumber,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Dropdown,
  Input,
  Modal,
  SectionHeader,
  Select,
  Skeleton,
  Textarea,
} from '../components/ui'
import { cn } from '../lib/cn'
import { fadeInUp, springPop, staggerChildren } from '../lib/motion'

/**
 * Temporary page for reviewing the design system visually.
 * It will be replaced by the real GroceryMate app once we start
 * building screens. Nothing here contains business logic.
 */

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="space-y-6"
    >
      <SectionHeader title={title} description={description} level={2} />
      {children}
    </motion.section>
  )
}

function Swatch({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className="space-y-1.5">
      <div className={cn('h-14 rounded-lg border border-ink/5', className)} />
      <p className="text-xs font-medium text-ink">{name}</p>
      <p className="font-mono text-[0.6875rem] text-muted">{hex}</p>
    </div>
  )
}

const brandScale: Array<[string, string, string]> = [
  ['50', '#f0f9f3', 'bg-brand-50'],
  ['100', '#dcf1e4', 'bg-brand-100'],
  ['200', '#bce3cc', 'bg-brand-200'],
  ['300', '#8ecfab', 'bg-brand-300'],
  ['400', '#58b283', 'bg-brand-400'],
  ['500', '#339363', 'bg-brand-500'],
  ['600', '#217a50', 'bg-brand-600'],
  ['700', '#1b6242', 'bg-brand-700'],
  ['800', '#174f37', 'bg-brand-800'],
  ['900', '#13412e', 'bg-brand-900'],
]

const neutrals: Array<[string, string, string]> = [
  ['canvas', '#faf8f5', 'bg-canvas'],
  ['surface', '#ffffff', 'bg-surface'],
  ['sand', '#f3f0ea', 'bg-sand'],
  ['line', 'ink / 9%', 'bg-line'],
  ['muted', '#6f6a61', 'bg-muted'],
  ['ink-soft', '#57524a', 'bg-ink-soft'],
  ['ink', '#2a2724', 'bg-ink'],
]

const statusColors: Array<[string, string, string]> = [
  ['success-50', '#e4f5eb', 'bg-success-50'],
  ['success-500', '#2fa266', 'bg-success-500'],
  ['warning-50', '#fbf2dd', 'bg-warning-50'],
  ['warning-500', '#e39a26', 'bg-warning-500'],
  ['danger-50', '#fcedeb', 'bg-danger-50'],
  ['danger-500', '#e05252', 'bg-danger-500'],
  ['mint-100', '#d8f2e4', 'bg-mint-100'],
  ['mint-200', '#b9e7cf', 'bg-mint-200'],
]

const memberAccents: Array<[string, string]> = [
  ['coral', 'bg-member-coral-soft text-member-coral-strong'],
  ['sky', 'bg-member-sky-soft text-member-sky-strong'],
  ['violet', 'bg-member-violet-soft text-member-violet-strong'],
  ['gold', 'bg-member-gold-soft text-member-gold-strong'],
  ['rose', 'bg-member-rose-soft text-member-rose-strong'],
  ['teal', 'bg-member-teal-soft text-member-teal-strong'],
]

const typeSamples: Array<{ label: string; className: string; text: string }> = [
  { label: 'text-display', className: 'text-display text-ink', text: 'Split groceries fairly.' },
  {
    label: 'text-2xl / bold - page title',
    className: 'text-2xl font-bold tracking-tight text-ink',
    text: 'Weekly shop with the flat',
  },
  {
    label: 'text-xl / semibold - section title',
    className: 'text-xl font-semibold tracking-tight text-ink',
    text: 'Who paid for what',
  },
  {
    label: 'text-base - body',
    className: 'text-base text-ink',
    text: 'Add each grocery item, pick who paid, and mark who shared it.',
  },
  {
    label: 'text-sm / muted - supporting',
    className: 'text-sm text-muted',
    text: 'Prices stay private to your household.',
  },
  {
    label: 'text-xs / medium - caption',
    className: 'text-xs font-medium uppercase tracking-wide text-muted',
    text: 'Last updated today',
  },
]

const spacingSteps: Array<[string, string, string]> = [
  ['1', '4px', 'w-1'],
  ['2', '8px', 'w-2'],
  ['3', '12px', 'w-3'],
  ['4', '16px', 'w-4'],
  ['6', '24px', 'w-6'],
  ['8', '32px', 'w-8'],
  ['12', '48px', 'w-12'],
  ['16', '64px', 'w-16'],
]

const radiusSteps: Array<[string, string, string]> = [
  ['rounded-sm', '8px - chips', 'rounded-sm'],
  ['rounded-md', '12px - buttons, inputs', 'rounded-md'],
  ['rounded-lg', '16px - icon tiles', 'rounded-lg'],
  ['rounded-xl', '20px - cards', 'rounded-xl'],
  ['rounded-2xl', '28px - modals, hero', 'rounded-2xl'],
]

const shadowSteps: Array<[string, string, string]> = [
  ['shadow-soft', 'resting controls', 'shadow-soft'],
  ['shadow-card', 'resting cards', 'shadow-card'],
  ['shadow-lifted', 'hover & overlays', 'shadow-lifted'],
]

const buttonVariants = ['primary', 'secondary', 'ghost', 'danger'] as const

const memberNames = ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza', 'Fatima Noor']

const motionRules = [
  'Durations: 150ms for press and hover feedback, 220ms for reveals, 320ms maximum.',
  'Tweens use ease-soft; physical feedback uses the shared springs (springSnappy, springGentle, springPop, springPanel).',
  'Animate only transform and opacity. Never animate layout, color, or size for feedback.',
  'Buttons: hover scale 1.02, press scale 0.97. Interactive cards lift 3px on a spring.',
  'Page transitions blend opacity, a directional shift, a 1.5% scale settle, and a brief blur: 260ms in, 130ms out.',
  'Entrances are subtle (8px fade-up) and run once. Loops are banned except one gentle float per empty state.',
  'Reduced motion is respected app-wide via MotionConfig reducedMotion="user".',
  'All presets live in src/lib/motion.ts. Do not hand-write durations in components.',
]

export function DesignSystemShowcase() {
  const [cardClicks, setCardClicks] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settled, setSettled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(2450)
  const [groceryOrder, setGroceryOrder] = useState([
    'Milk (2L)',
    'Brown bread',
    'Eggs (dozen)',
    'Basmati rice',
  ])
  const [splitWith, setSplitWith] = useState<string | null>(null)

  // Success pop resets itself so the demo can be replayed.
  useEffect(() => {
    if (!settled) return
    const timer = setTimeout(() => setSettled(false), 2200)
    return () => clearTimeout(timer)
  }, [settled])

  // Skeleton demo: pretend to load for a moment.
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setLoading(false), 1800)
    return () => clearTimeout(timer)
  }, [loading])

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
              <Leaf size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-tight text-ink">GroceryMate</p>
              <p className="text-sm text-muted">Split groceries fairly. Keep living simple.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Badge tone="mint" icon={Sparkles}>
              Design system · v0.1
            </Badge>
            <h1 className="text-display text-ink">Design foundation</h1>
            <p className="max-w-xl text-muted">
              Temporary showcase of every token and component in the GroceryMate design system.
              This page gets replaced by the real app once we start building screens.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-16 px-4 pt-12 sm:px-6">
        <Section
          title="Color"
          description="Fresh green for actions, warm neutrals for surfaces, soft accents for people and status."
        >
          <Card padding="lg" className="space-y-8">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Brand green</h3>
              <div className="grid grid-cols-5 gap-3 md:grid-cols-10">
                {brandScale.map(([name, hex, className]) => (
                  <Swatch key={name} name={name} hex={hex} className={className} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Warm neutrals</h3>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                {neutrals.map(([name, hex, className]) => (
                  <Swatch key={name} name={name} hex={hex} className={className} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Status & mint accent</h3>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                {statusColors.map(([name, hex, className]) => (
                  <Swatch key={name} name={name} hex={hex} className={className} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink">Member accents</h3>
              <p className="text-sm text-muted">
                Soft background + readable text pairs, assigned to household members.
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {memberAccents.map(([name, className]) => (
                  <div key={name} className="space-y-1.5">
                    <div
                      className={cn(
                        'flex h-14 items-center justify-center rounded-lg text-sm font-semibold',
                        className,
                      )}
                    >
                      Aa
                    </div>
                    <p className="text-xs font-medium text-ink">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Section>

        <Section
          title="Typography"
          description="Inter Variable everywhere. Tight tracking on headings, relaxed and readable body text."
        >
          <Card padding="lg" className="space-y-6">
            {typeSamples.map(({ label, className, text }) => (
              <div key={label} className="grid gap-1 sm:grid-cols-[14rem_1fr] sm:items-baseline sm:gap-6">
                <p className="font-mono text-[0.6875rem] text-muted">{label}</p>
                <p className={className}>{text}</p>
              </div>
            ))}
          </Card>
        </Section>

        <Section
          title="Spacing"
          description="A 4px base unit. Stick to the marked steps so rhythm stays consistent."
        >
          <Card padding="lg" className="space-y-6">
            <div className="space-y-2">
              {spacingSteps.map(([step, px, widthClass]) => (
                <div key={step} className="flex items-center gap-4">
                  <p className="w-16 font-mono text-[0.6875rem] text-muted">
                    {step} · {px}
                  </p>
                  <div className={cn('h-3 rounded-full bg-brand-300', widthClass)} />
                </div>
              ))}
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              <li>Within a component: gap-1.5 to gap-3. Between form fields: gap-5 or gap-6.</li>
              <li>Card padding comes from the Card padding prop (sm / md / lg), not ad-hoc classes.</li>
              <li>Page gutters: px-4 on mobile, px-6 from the sm breakpoint. Sections: space-y-16.</li>
              <li>Touch targets stay at least 44px tall (h-11 medium buttons and inputs).</li>
            </ul>
          </Card>
        </Section>

        <Section
          title="Radius & shadows"
          description="Rounded, soft, and warm. Shadows are tinted with ink, never pure black."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Card padding="lg" className="space-y-4">
              {radiusSteps.map(([name, usage, radiusClass]) => (
                <div key={name} className="flex items-center gap-4">
                  <div className={cn('size-14 shrink-0 border border-line bg-sand', radiusClass)} />
                  <div>
                    <p className="font-mono text-xs text-ink">{name}</p>
                    <p className="text-sm text-muted">{usage}</p>
                  </div>
                </div>
              ))}
            </Card>
            <Card padding="lg" className="space-y-5">
              {shadowSteps.map(([name, usage, shadowClass]) => (
                <div key={name} className="flex items-center gap-4">
                  <div className={cn('h-14 w-24 shrink-0 rounded-lg bg-surface', shadowClass)} />
                  <div>
                    <p className="font-mono text-xs text-ink">{name}</p>
                    <p className="text-sm text-muted">{usage}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </Section>

        <Section
          title="Buttons"
          description="Four variants, three sizes. Primary is for the single main action on a screen."
        >
          <Card padding="lg" className="space-y-6">
            {buttonVariants.map((variant) => (
              <div key={variant} className="flex flex-wrap items-center gap-3">
                <p className="w-full font-mono text-[0.6875rem] text-muted sm:w-24">{variant}</p>
                <Button variant={variant} size="sm">
                  Add item
                </Button>
                <Button variant={variant}>Add item</Button>
                <Button variant={variant} size="lg">
                  Add item
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <p className="w-full font-mono text-[0.6875rem] text-muted sm:w-24">with icons</p>
              <Button iconLeft={Plus}>Add item</Button>
              <Button variant="secondary" iconRight={ArrowRight}>
                Continue
              </Button>
              <Button variant="ghost" iconLeft={Search}>
                Search
              </Button>
              <Button variant="danger" iconLeft={Trash2}>
                Remove
              </Button>
            </div>
            <div className="border-t border-line pt-6">
              <Button fullWidth iconLeft={ShoppingBasket}>
                Start a grocery session
              </Button>
            </div>
          </Card>
        </Section>

        <Section
          title="Form controls"
          description="Label, helper text, focus ring, and error state on every control. Click into a field to see the focus treatment."
        >
          <Card padding="lg">
            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                label="Item name"
                placeholder="e.g. Milk (2L)"
                helperText="Add one grocery item at a time."
              />
              <Input label="Search members" placeholder="Search…" iconLeft={Search} />
              <Input
                label="Price"
                placeholder="0.00"
                inputMode="decimal"
                error="Price is required."
              />
              <Input
                label="Household name"
                defaultValue="Flat 4B"
                disabled
                helperText="Locked while a session is active."
              />
              <Select label="Paid by" helperText="Who covered this item?" defaultValue="">
                <option value="" disabled>
                  Choose a member
                </option>
                {memberNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Notes"
                placeholder="Anything the household should know…"
                helperText="Optional."
              />
              <Dropdown
                label="Split between"
                placeholder="Choose a member"
                helperText="Animated dropdown: arrows, Enter, and Escape all work."
                options={memberNames.map((name) => ({ value: name, label: name }))}
                value={splitWith}
                onChange={setSplitWith}
              />
              <div className="space-y-4 pt-1">
                <Checkbox
                  label="Shared item"
                  description="Everyone in the household splits it."
                  defaultChecked
                />
                <Checkbox label="Add to next week's list too" />
              </div>
            </div>
          </Card>
        </Section>

        <Section
          title="Cards"
          description="Gradient hairline borders, layered shadows, and an optional icon header with a per-card accent."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Card icon={ShoppingBasket} accent="brand" title="Weekly shop" subtitle="12 items · 4 members">
              <p className="text-sm text-muted">
                The default surface: gradient hairline, warm layered shadow, and a whisper of
                accent in the corner.
              </p>
            </Card>
            <Card
              variant="interactive"
              icon={Users}
              accent="violet"
              title="Interactive"
              subtitle="Hover to lift, press to squish"
              onClick={() => setCardClicks((count) => count + 1)}
            >
              <p className="text-sm font-medium text-brand-700">
                Clicked {cardClicks} {cardClicks === 1 ? 'time' : 'times'}
              </p>
            </Card>
            <Card variant="highlighted" icon={Sparkles} accent="mint" title="Highlighted">
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  For the recommended option, an active selection, or a gentle callout.
                </p>
                <Badge tone="brand" icon={Sparkles}>
                  Suggested
                </Badge>
              </div>
            </Card>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Card padding="sm" icon={HandCoins} accent="gold" title="Settlements" subtitle="2 pending" />
            <Card padding="sm" icon={History} accent="sky" title="History" subtitle="6 sessions saved" />
            <Card padding="sm" icon={Heart} accent="rose" title="Shared fairly" subtitle="No one overpays" />
          </div>
        </Section>

        <Section
          title="Badges"
          description="Small statuses and counts. One size, six tones. Hover for a gentle nudge."
        >
          <Card padding="lg">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="neutral" icon={Users}>
                4 members
              </Badge>
              <Badge tone="brand" icon={ShoppingBasket}>
                12 items
              </Badge>
              <Badge tone="mint" icon={Sparkles}>
                Shared
              </Badge>
              <Badge tone="success" icon={Check}>
                Settled
              </Badge>
              <Badge tone="warning" icon={TriangleAlert}>
                Pending
              </Badge>
              <Badge tone="danger">Overdue</Badge>
              <Badge tone="neutral">No icon</Badge>
            </div>
          </Card>
        </Section>

        <Section
          title="Avatars"
          description="Initials on a soft member accent, derived from the name so each member stays consistent. Hover one; it springs."
        >
          <Card padding="lg" className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {memberNames.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <Avatar name={name} />
                  <span className="text-sm text-ink-soft">{name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-6 border-t border-line pt-6">
              <div className="flex items-center gap-3">
                <Avatar name="Aisha Khan" size="sm" />
                <Avatar name="Aisha Khan" size="md" />
                <Avatar name="Aisha Khan" size="lg" />
                <span className="text-sm text-muted">sm · md · lg</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {memberNames.slice(0, 4).map((name) => (
                    <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
                  ))}
                  <span className="flex size-8 items-center justify-center rounded-full bg-sand text-[0.6875rem] font-semibold text-ink-soft ring-2 ring-surface">
                    +2
                  </span>
                </div>
                <span className="text-sm text-muted">stacked</span>
              </div>
            </div>
          </Card>
        </Section>

        <Section
          title="Section header"
          description="The standard way to open any page area: title, optional description, icon, and an action slot."
        >
          <Card padding="lg" className="space-y-8">
            <SectionHeader
              level={2}
              icon={ShoppingBasket}
              title="This week's groceries"
              description="Everything the household added between Monday and Sunday."
              action={
                <Button size="sm" iconLeft={Plus}>
                  Add item
                </Button>
              }
            />
            <SectionHeader
              level={3}
              title="Members"
              description="People sharing this household."
              action={
                <Button size="sm" variant="ghost" iconLeft={Plus}>
                  Invite
                </Button>
              }
            />
          </Card>
        </Section>

        <Section
          title="Interactions"
          description="Overlays, feedback, and list behaviors. Everything runs on transforms and opacity."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Card padding="lg" className="space-y-4">
              <h3 className="text-base font-semibold text-ink">Overlays</h3>
              <p className="text-sm text-muted">
                Modals scale in from the center; drawers slide from an edge. Both close on
                Escape or backdrop click.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setModalOpen(true)}>
                  Open modal
                </Button>
                <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
                  Open drawer
                </Button>
              </div>
            </Card>

            <Card padding="lg" className="space-y-4">
              <h3 className="text-base font-semibold text-ink">Animated numbers</h3>
              <div>
                <AnimatedNumber
                  value={total}
                  className="text-3xl font-bold tracking-tight text-ink"
                />
                <p className="mt-1 text-sm text-muted">spent this month</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={RotateCcw}
                onClick={() => setTotal(1200 + Math.round(Math.random() * 3600))}
              >
                Recalculate
              </Button>
            </Card>

            <Card padding="lg" className="space-y-4">
              <h3 className="text-base font-semibold text-ink">Success feedback</h3>
              <p className="text-sm text-muted">
                Confirmations pop in with a slight spring overshoot, then settle.
              </p>
              <div className="flex min-h-9 flex-wrap items-center gap-3">
                <Button size="sm" iconLeft={Check} onClick={() => setSettled(true)}>
                  Mark as settled
                </Button>
                <AnimatePresence>
                  {settled && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0, transition: springPop }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Badge tone="success" icon={Check}>
                        Settled with Bilal
                      </Badge>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Card>

            <Card padding="lg" className="space-y-4">
              <h3 className="text-base font-semibold text-ink">Skeleton loading</h3>
              {loading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar name="Aisha Khan" />
                    <div>
                      <p className="text-sm font-medium text-ink">Aisha Khan</p>
                      <p className="text-xs text-muted">added 3 items</p>
                    </div>
                  </div>
                  <p className="text-sm text-ink-soft">
                    Milk, brown bread, and eggs were added to this week's list.
                  </p>
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={() => setLoading(true)}>
                Simulate loading
              </Button>
            </Card>
          </div>

          <Card padding="lg" className="space-y-3">
            <h3 className="text-base font-semibold text-ink">Hover to reveal actions</h3>
            <p className="text-sm text-muted">
              Member rows keep actions hidden until hover or keyboard focus.
            </p>
            <div className="space-y-2">
              {['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee'].map((name, index) => (
                <div
                  key={name}
                  className="group card-surface relative flex items-center gap-3 rounded-lg px-4 py-3 shadow-soft transition-shadow hover:shadow-panel-hover"
                >
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{name}</p>
                    <p className="text-xs text-muted">{index === 0 ? 'Owner' : 'Member'}</p>
                  </div>
                  <div className="flex translate-x-1 gap-1 opacity-0 transition-all duration-200 group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={Pencil}
                      aria-label={`Edit ${name}`}
                      className="w-9 px-0"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={Trash2}
                      aria-label={`Remove ${name}`}
                      className="w-9 px-0 text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg" className="space-y-3">
            <h3 className="text-base font-semibold text-ink">Drag to reorder</h3>
            <p className="text-sm text-muted">
              Grab an item and drag it; the list makes room with a spring.
            </p>
            <Reorder.Group
              axis="y"
              values={groceryOrder}
              onReorder={setGroceryOrder}
              className="space-y-2"
            >
              {groceryOrder.map((item) => (
                <Reorder.Item
                  key={item}
                  value={item}
                  whileDrag={{ scale: 1.02 }}
                  className="card-surface flex cursor-grab items-center gap-3 rounded-lg px-4 py-3 shadow-soft active:cursor-grabbing"
                >
                  <GripVertical size={16} aria-hidden="true" className="shrink-0 text-muted" />
                  <span className="text-sm font-medium text-ink">{item}</span>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </Card>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Remove Basmati rice?"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" iconLeft={Trash2} onClick={() => setModalOpen(false)}>
                  Remove item
                </Button>
              </>
            }
          >
            <p className="text-sm text-ink-soft">
              This removes the item from this week's list. Anyone in the household can add
              it back later.
            </p>
          </Modal>

          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Add grocery item"
            footer={
              <>
                <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button iconLeft={Plus} onClick={() => setDrawerOpen(false)}>
                  Add item
                </Button>
              </>
            }
          >
            <div className="space-y-5 pb-2">
              <Input label="Item name" placeholder="e.g. Milk (2L)" />
              <Select label="Paid by" defaultValue="">
                <option value="" disabled>
                  Choose a member
                </option>
                {memberNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </Drawer>
        </Section>

        <Section
          title="Motion"
          description="Motion is feedback, not decoration. Buttons and interactive cards above already follow these rules."
        >
          <Card padding="lg" className="space-y-6">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
              {motionRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-line pt-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-ink">List entrance (fadeInUp + stagger)</p>
                <Button
                  size="sm"
                  variant="secondary"
                  iconLeft={RotateCcw}
                  onClick={() => setReplayKey((key) => key + 1)}
                >
                  Replay
                </Button>
              </div>
              <motion.ul
                key={replayKey}
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {['Milk (2L)', 'Brown bread', 'Eggs (dozen)'].map((item) => (
                  <motion.li
                    key={item}
                    variants={fadeInUp}
                    className="card-surface flex items-center justify-between rounded-lg px-4 py-3 text-sm shadow-soft"
                  >
                    <span className="font-medium text-ink">{item}</span>
                    <Badge tone="mint">Shared</Badge>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </Card>
        </Section>
      </main>
    </div>
  )
}

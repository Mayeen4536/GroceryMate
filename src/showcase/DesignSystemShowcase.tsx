import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Check,
  Leaf,
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
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  SectionHeader,
  Select,
  Textarea,
} from '../components/ui'
import { cn } from '../lib/cn'
import { fadeInUp, staggerChildren } from '../lib/motion'

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
    <section className="space-y-6">
      <SectionHeader title={title} description={description} level={2} />
      {children}
    </section>
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
  ['line', '#e7e2da', 'bg-line'],
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
  'One easing curve everywhere: ease-soft (cubic-bezier 0.22, 1, 0.36, 1).',
  'Animate only transform and opacity. Never animate layout, color, or size for feedback.',
  'Press feedback: scale to 0.97. Hover lift on interactive cards: 2px up.',
  'Entrances are subtle (8px fade-up) and run once. Nothing loops or bounces.',
  'Reduced motion is respected app-wide via MotionConfig reducedMotion="user".',
  'All presets live in src/lib/motion.ts. Do not hand-write durations in components.',
]

export function DesignSystemShowcase() {
  const [cardClicks, setCardClicks] = useState(0)
  const [replayKey, setReplayKey] = useState(0)

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
            </div>
          </Card>
        </Section>

        <Section
          title="Cards"
          description="Normal for content, interactive for clickable rows and tiles, highlighted for suggestions and selection."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <h3 className="text-base font-semibold text-ink">Normal</h3>
              <p className="mt-1 text-sm text-muted">
                The default container for content. Soft border, warm shadow, generous padding.
              </p>
              <div className="mt-4">
                <Badge tone="neutral" icon={Users}>
                  4 members
                </Badge>
              </div>
            </Card>
            <Card variant="interactive" onClick={() => setCardClicks((count) => count + 1)}>
              <h3 className="text-base font-semibold text-ink">Interactive</h3>
              <p className="mt-1 text-sm text-muted">
                Hover to lift, press to squish. Also focusable - try Tab then Enter.
              </p>
              <p className="mt-4 text-sm font-medium text-brand-700">
                Clicked {cardClicks} {cardClicks === 1 ? 'time' : 'times'}
              </p>
            </Card>
            <Card variant="highlighted">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">Highlighted</h3>
                <Badge tone="brand" icon={Sparkles}>
                  Suggested
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                For the recommended option, an active selection, or a gentle callout.
              </p>
            </Card>
          </div>
        </Section>

        <Section title="Badges" description="Small statuses and counts. One size, six tones.">
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
          description="Initials on a soft member accent. The color is derived from the name, so each member stays consistent."
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
                    <Avatar key={name} name={name} size="sm" />
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
                    className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 text-sm"
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

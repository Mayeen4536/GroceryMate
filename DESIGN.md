# GroceryMate Design System

Modern, calm, premium, friendly. Fresh green on warm neutrals, generous
whitespace, layered depth, rounded cards, physical motion.

Depth model: surfaces separate through layered shadows and hairline alpha
borders rather than solid 1px lines. The dark pine chrome (desktop sidebar,
mobile dock) anchors the interface; content lives on a warm canvas with
subtle ambient washes at the top of the page.

All tokens live in [src/index.css](src/index.css) as Tailwind `@theme` variables, so every
token is available both as a CSS variable (`var(--color-brand-600)`) and as a
Tailwind utility (`bg-brand-600`). Reusable components live in
[src/components/ui/](src/components/ui/).

## Color

| Token | Value | Use |
| --- | --- | --- |
| `brand-50…900` | greens around `#217a50` | Primary actions (600), hover (700), tints (50-200) |
| `mint-50…700` | soft mint | Secondary accent: friendly highlights, "shared" states |
| `canvas` | `#faf8f5` | App background (warm off-white) |
| `surface` | `#ffffff` | Cards, inputs |
| `sand` | `#f3f0ea` | Soft fills, ghost-button hover, disabled fields |
| `line` / `line-strong` | ink at 9% / 16% | Hairline dividers / input borders |
| `ink` / `ink-soft` / `muted` | `#2a2724` / `#57524a` / `#6f6a61` | Primary / secondary / muted text |
| `pine-950/900/800` | deep greens from `#0b1912` | Dark chrome surfaces (sidebar, dock) |
| `pine-text` / `pine-muted` / `pine-mint` | `#eef1e9` / `#9fac9d` / `#86dcae` | Text and active accent on pine |
| `success-50/500/700` | greens | Positive status |
| `warning-50/500/700` | warm ambers | Attention status |
| `danger-50/500/600/700` | soft reds | Errors; 600 is the button fill (AA with white) |
| `member-{coral,sky,violet,gold,rose,teal}-{soft,strong}` | pastel pairs | Avatars and member chips |

Rules: `brand-600` is the only primary-action color. Status colors always pair
a `-50` background with a `-700` text tone. Never use pure black or pure gray.

## Typography

Inter Variable (self-hosted via `@fontsource-variable/inter`), system-ui fallback.

- `text-display` - 40px/1.1, bold, -0.025em: hero headlines only
- `text-2xl font-bold tracking-tight` - page titles
- `text-xl font-semibold tracking-tight` - section titles (SectionHeader level 2)
- `text-base` - body; `text-[0.9375rem]` (15px) inside form controls
- `text-sm text-muted` - helper and supporting text
- `text-xs font-medium` - captions, badges, overlines

## Spacing

4px base unit (Tailwind default scale). Preferred steps: 4, 8, 12, 16, 24, 32, 48, 64.

- Inside a component: `gap-1.5`-`gap-3`; between form fields: `gap-5`/`gap-6`
- Card padding via the `padding` prop: sm `p-4`, md `p-5 sm:p-6`, lg `p-6 sm:p-8`
- Page gutters `px-4 sm:px-6`; content max width `max-w-5xl`; sections `space-y-16`
- Touch targets ≥ 44px (`h-11` md buttons and inputs)

## Radius

| Utility | Size | Use |
| --- | --- | --- |
| `rounded-sm` | 8px | chips, tiny controls |
| `rounded-md` | 12px | buttons, inputs |
| `rounded-lg` | 16px | icon tiles, small cards |
| `rounded-xl` | 20px | cards |
| `rounded-2xl` | 28px | modals, hero surfaces |
| `rounded-full` | - | badges, avatars, pills |

## Shadows and card surfaces

Warm ink-tinted, never black, always layered. Cards use the `card-surface`
utility (gradient hairline border, lighter at top the way light falls, over a
barely-warm background gradient) with `shadow-panel`, deepening to
`shadow-panel-hover` on hover. `card-surface-mint` is the highlighted
variant. `shadow-card`/`shadow-lifted` (with a baked-in hairline) remain for
small tiles and floating elements; `shadow-soft` for resting controls;
`shadow-button`, `shadow-button-brand` and `shadow-button-danger` add an
inset top highlight so buttons catch light; `shadow-dock` floats the mobile
dock.

## Motion

Presets in [src/lib/motion.ts](src/lib/motion.ts); do not hand-write durations in components.

- Durations: 150ms (press/hover), 220ms (reveals), 320ms max
- Easing: `ease-soft` = cubic-bezier(0.22, 1, 0.36, 1) for tweens. Springs:
  `springSnappy` (nav pills, presses), `springGentle` (hover lifts),
  `springPop` (success confirmations, slight overshoot), `springPanel`
  (modals/drawers, no visible bounce)
- Animate transform and opacity only; hover = scale 1.02 (buttons), press =
  scale 0.97, card hover = 3px lift
- Micro-feedback everywhere: button icons nudge on hover, avatars and badges
  spring slightly on hover, field labels and icons warm to brand on focus,
  error messages animate in, close buttons rotate their X, checkboxes draw
  their check
- Page switches: `PageTransition` (wraps `pageVariants` + `riseChild`);
  opacity + directional shift + 1.5% scale settle + brief blur, 260ms in and
  130ms out. The slide direction follows nav order (pass direction through
  `custom` on AnimatePresence and the page root). Transform and filter both
  composite on the GPU.
- Entrances: 8px fade-up, once per mount; showcase sections reveal on scroll
  (`whileInView`, once)
- Loops are banned except gentle ambient drift (5s+, few px, transform/opacity
  only) in empty states and the landing hero, and inside dedicated experience
  pieces (loaders, flow visualizations) where motion is the content
- Skeletons shimmer via background-position (paint-only); add
  `motion-reduce:animate-none`
- Reduced motion respected globally (`MotionConfig reducedMotion="user"` in App)

## Components (`src/components/ui`)

- **Button** - variants `primary | secondary | ghost | danger`, sizes `sm | md | lg`, `iconLeft`/`iconRight` (Lucide), `fullWidth`. Primary/danger are subtle vertical gradients with inset light and a colored glow. Defaults to `type="button"`.
- **Card** - variants `default | interactive | highlighted`, `padding` prop, plus optional personality: `icon` (gradient gem tile), `title`/`subtitle` (premium tracking), and `accent` (`neutral | brand | mint | violet | gold | sky | rose`) which tints the tile and adds a soft corner glow. Gradient hairline border + layered `shadow-panel`; all cards deepen slightly on hover, interactive ones also lift on a spring with button semantics.
- **Input / Textarea / Select** - shared `label`, `helperText`, `error` API (see `field.tsx`); auto-wired `aria-describedby`/`aria-invalid`; `className` styles the outer wrapper. Select renders native `<option>` children.
- **Badge** - tones `neutral | brand | mint | success | warning | danger`, optional `icon`.
- **Avatar** - initials + member accent derived from `name` (pin with `tone` index); sizes `sm | md | lg`.
- **SectionHeader** - `title`, `description`, `icon`, `action` slot, heading `level` 1-3.
- **Checkbox** - real input, styled box; the check mark draws itself in and the box pops on check. `label` + `description` props.
- **Dropdown** - animated select (`options`, `value`, `onChange`); menu springs open, chevron rotates, full keyboard support (combobox/listbox semantics). Use native Select for dense plain forms.
- **Modal** - centered dialog (`open`, `onClose`, `title`, `footer` slot); scales in on `springPanel`, Escape/backdrop close, body scroll lock.
- **Drawer** - edge panel, `side: right | bottom`; same API and behaviors as Modal.
- **Skeleton** - shimmer placeholder sized via `className`.
- **AnimatedNumber** - counts toward `value` with `format` callback; tabular digits, honors reduced motion.

## Experience components (`src/components/experience`)

Signature moments. Use sparingly; each is tied to a meaning.

- **BasketLoader** - the loading state: groceries drop into a bobbing basket. The only sanctioned spinner replacement.
- **Celebration** - one-shot confetti burst (`trigger` counter, radiates from the nearest `relative` ancestor, self-clears in ~1s). Reserved exclusively for a completed settlement. Honors reduced motion.
- **SettlementFlow** - dots travel from debtor to creditor while the amount counts up on scroll into view.

Taste rules: confetti only on settlement completion, never on page load or
minor actions. One signature moment per screen. If an animation does not
carry meaning, it does not ship.

UI stays presentational: components receive data via props and report events via
callbacks. Business logic (splitting, sessions, persistence) will live outside
`components/ui` when it arrives.

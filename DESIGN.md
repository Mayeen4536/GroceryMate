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

## Shadows

Warm ink-tinted, never black, always layered. `shadow-card` and
`shadow-lifted` include a `0 0 0 1px` hairline layer that replaces borders
on cards. `shadow-soft` for resting controls; `shadow-button`
(secondary), `shadow-button-brand` and `shadow-button-danger` add an inset
top highlight so buttons catch light; `shadow-dock` floats the mobile dock.
Hover elevates `card → lifted`.

## Motion

Presets in [src/lib/motion.ts](src/lib/motion.ts); do not hand-write durations in components.

- Durations: 150ms (press/hover), 220ms (reveals), 320ms max
- Easing: `ease-soft` = cubic-bezier(0.22, 1, 0.36, 1) for tweens. Springs:
  `springSnappy` (nav pills, presses), `springGentle` (hover lifts),
  `springPop` (success confirmations, slight overshoot), `springPanel`
  (modals/drawers, no visible bounce)
- Animate transform and opacity only; hover = scale 1.02 (buttons), press =
  scale 0.97, card hover = 3px lift
- Page switches: `pageVariants` + `riseChild`; the slide direction follows nav
  order (pass direction through `custom` on AnimatePresence and the page root)
- Entrances: 8px fade-up, once per mount; showcase sections reveal on scroll
  (`whileInView`, once)
- Loops are banned except one ambient float per empty state (5s+, few px)
- Skeletons shimmer via background-position (paint-only); add
  `motion-reduce:animate-none`
- Reduced motion respected globally (`MotionConfig reducedMotion="user"` in App)

## Components (`src/components/ui`)

- **Button** - variants `primary | secondary | ghost | danger`, sizes `sm | md | lg`, `iconLeft`/`iconRight` (Lucide), `fullWidth`. Primary/danger are subtle vertical gradients with inset light and a colored glow. Defaults to `type="button"`.
- **Card** - variants `default | interactive | highlighted`, `padding` prop. Borderless; depth comes from layered shadows. Interactive + `onClick` adds button role, keyboard activation, spring hover lift.
- **Input / Textarea / Select** - shared `label`, `helperText`, `error` API (see `field.tsx`); auto-wired `aria-describedby`/`aria-invalid`; `className` styles the outer wrapper. Select renders native `<option>` children.
- **Badge** - tones `neutral | brand | mint | success | warning | danger`, optional `icon`.
- **Avatar** - initials + member accent derived from `name` (pin with `tone` index); sizes `sm | md | lg`.
- **SectionHeader** - `title`, `description`, `icon`, `action` slot, heading `level` 1-3.
- **Modal** - centered dialog (`open`, `onClose`, `title`, `footer` slot); scales in on `springPanel`, Escape/backdrop close, body scroll lock.
- **Drawer** - edge panel, `side: right | bottom`; same API and behaviors as Modal.
- **Skeleton** - shimmer placeholder sized via `className`.
- **AnimatedNumber** - counts toward `value` with `format` callback; tabular digits, honors reduced motion.

UI stays presentational: components receive data via props and report events via
callbacks. Business logic (splitting, sessions, persistence) will live outside
`components/ui` when it arrives.

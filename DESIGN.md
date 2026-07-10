# GroceryMate Design System

Modern, calm, premium, friendly. Fresh green on warm neutrals, generous
whitespace, soft shadows, rounded cards, subtle motion.

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
| `line` | `#e7e2da` | Borders and dividers |
| `ink` / `ink-soft` / `muted` | `#2a2724` / `#57524a` / `#6f6a61` | Primary / secondary / muted text |
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

Warm ink-tinted, never black: `shadow-soft` (resting controls),
`shadow-card` (resting cards), `shadow-lifted` (hover and overlays).
Hover elevates `card → lifted`; nothing casts a hard shadow.

## Motion

Presets in [src/lib/motion.ts](src/lib/motion.ts); do not hand-write durations in components.

- Durations: 150ms (press/hover), 220ms (reveals), 320ms max
- Single easing: `ease-soft` = cubic-bezier(0.22, 1, 0.36, 1)
- Animate transform and opacity only; press = scale 0.97, card hover = 2px lift
- Entrances: 8px fade-up, once per mount; never loop, never bounce
- Reduced motion respected globally (`MotionConfig reducedMotion="user"` in App)

## Components (`src/components/ui`)

- **Button** - variants `primary | secondary | ghost | danger`, sizes `sm | md | lg`, `iconLeft`/`iconRight` (Lucide), `fullWidth`. Defaults to `type="button"`.
- **Card** - variants `default | interactive | highlighted`, `padding` prop. Interactive + `onClick` adds button role, keyboard activation, hover lift.
- **Input / Textarea / Select** - shared `label`, `helperText`, `error` API (see `field.tsx`); auto-wired `aria-describedby`/`aria-invalid`; `className` styles the outer wrapper. Select renders native `<option>` children.
- **Badge** - tones `neutral | brand | mint | success | warning | danger`, optional `icon`.
- **Avatar** - initials + member accent derived from `name` (pin with `tone` index); sizes `sm | md | lg`.
- **SectionHeader** - `title`, `description`, `icon`, `action` slot, heading `level` 1-3.

UI stays presentational: components receive data via props and report events via
callbacks. Business logic (splitting, sessions, persistence) will live outside
`components/ui` when it arrives.

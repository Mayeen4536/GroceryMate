import { Brand } from '../../components/layout/Brand'

/** Static about panel: version, description, and the stack it's built on. */
export function AboutContent() {
  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <Brand withTagline />
        <span className="text-xs text-muted">Version 0.1.0 · Visual foundation</span>
      </div>
      <p className="text-sm leading-relaxed text-ink-soft">
        GroceryMate helps flatmates and shared homes split groceries fairly. Add what you buy,
        tag who shares it, and the app works out exactly who owes whom.
      </p>
      <div className="card-surface rounded-lg p-4 shadow-soft">
        <p className="text-xs text-muted">Built with</p>
        <p className="mt-1 text-sm text-ink-soft">React, Tailwind CSS, and Framer Motion.</p>
      </div>
    </div>
  )
}

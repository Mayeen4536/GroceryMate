import { ShieldCheck } from 'lucide-react'

const POINTS = [
  {
    title: 'Nothing leaves this device',
    body: 'This preview keeps every grocery, member, and settlement in memory on your device. Nothing is sent to a server.',
  },
  {
    title: 'No accounts, no tracking',
    body: 'There is no sign-in, analytics, or third-party sharing in this build.',
  },
  {
    title: 'Data resets on refresh',
    body: 'Since nothing is saved yet, reloading the app starts fresh from the sample household.',
  },
]

/** Static privacy summary. Honest about the current no-backend, no-persistence state. */
export function PrivacyContent() {
  return (
    <div className="flex flex-col gap-5 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-member-sky-soft to-mint-50 text-member-sky-strong shadow-soft ring-1 ring-ink/5">
          <ShieldCheck size={19} aria-hidden="true" />
        </span>
        <p className="text-sm text-muted">How GroceryMate handles your data today.</p>
      </div>
      <ul className="space-y-3">
        {POINTS.map((point) => (
          <li key={point.title} className="card-surface rounded-lg p-4 shadow-soft">
            <p className="text-sm font-medium text-ink">{point.title}</p>
            <p className="mt-1 text-sm text-muted">{point.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

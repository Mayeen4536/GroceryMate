import { ShieldCheck } from 'lucide-react'

const POINTS = [
  {
    title: 'GroceryMate uses accounts',
    body: 'You sign in with an email and password. Your household, member, and grocery data is stored in our hosted backend (Supabase), not just on this device.',
  },
  {
    title: 'Your data is used to run the app',
    body: 'We use what you enter to show your groceries, members, and settlements, and to keep them in sync across sign-ins.',
  },
  {
    title: 'We don’t sell your data',
    body: 'GroceryMate does not currently sell your data to third parties.',
  },
  {
    title: 'This is a private beta',
    body: 'Please avoid entering sensitive information you wouldn’t want stored — things like full card numbers or government IDs.',
  },
  {
    title: 'Questions about your data?',
    body: 'For privacy or data-related questions, contact hello.onehourai@gmail.com.',
  },
]

/** Static privacy summary. Honest about the current hosted-backend, accounts-based state. */
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

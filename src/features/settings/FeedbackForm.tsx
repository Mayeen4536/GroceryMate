import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'

/** Contact address for private-beta feedback — temporary until a product decision picks a permanent one. */
const FEEDBACK_EMAIL = 'hello.onehourai@gmail.com'

/**
 * Feedback composer. There is no feedback backend: submitting opens the
 * user's own email app, addressed to us, with their note prefilled — it
 * never claims GroceryMate itself received or sent anything.
 */
export function FeedbackForm() {
  const [message, setMessage] = useState('')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = message.trim()
        if (!trimmed) return
        const subject = encodeURIComponent('GroceryMate Beta Feedback')
        const body = encodeURIComponent(trimmed)
        window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
      }}
      className="flex flex-col gap-4 pb-4"
    >
      <p className="text-sm text-muted">
        Tell us what's working, what's confusing, or what you'd like to see next.
      </p>
      <Textarea
        label="Your feedback"
        placeholder="I'd love it if GroceryMate could…"
        rows={6}
        autoFocus
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <p className="text-xs text-muted">
        This opens your email app with a message addressed to {FEEDBACK_EMAIL} — nothing is sent
        automatically.
      </p>
      <Button type="submit" iconLeft={Send} disabled={!message.trim()}>
        Open email to send feedback
      </Button>
    </form>
  )
}

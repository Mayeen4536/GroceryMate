import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Send } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { transitionBase } from '@/animations/motion'

/** Feedback composer. Nothing is sent anywhere; submitting just shows a local thank-you. */
export function FeedbackForm() {
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionBase}
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-mint-100 text-brand-700">
          <Check size={24} aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-base font-semibold text-ink">Thanks for the note.</p>
          <p className="mx-auto max-w-xs text-sm text-muted">
            This preview doesn't send feedback anywhere yet, but it's noted for this session.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setMessage('')
            setSubmitted(false)
          }}
        >
          Write another note
        </Button>
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!message.trim()) return
        setSubmitted(true)
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
      <Button type="submit" iconLeft={Send} disabled={!message.trim()}>
        Send feedback
      </Button>
    </form>
  )
}

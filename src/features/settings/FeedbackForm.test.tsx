import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FeedbackForm } from './FeedbackForm'

describe('FeedbackForm', () => {
  const originalLocation = window.location

  afterEach(cleanup)

  beforeEach(() => {
    // jsdom's real `window.location` throws on a bare reassignment — swap in a
    // writable stand-in so the mailto navigation can be observed instead of
    // actually navigating anywhere.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('opens a mailto link addressed to the feedback inbox with the note prefilled, and never claims it was sent', () => {
    render(<FeedbackForm />)

    fireEvent.change(screen.getByLabelText('Your feedback'), {
      target: { value: 'Please add dark mode' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open email to send feedback' }))

    expect(window.location.href).toBe(
      'mailto:hello.onehourai@gmail.com?subject=GroceryMate%20Beta%20Feedback&body=Please%20add%20dark%20mode',
    )
    expect(screen.queryByText(/thanks for the note/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/received|submitted/i)).not.toBeInTheDocument()
  })

  it('does not open the mail client for an empty or whitespace-only note', () => {
    render(<FeedbackForm />)

    expect(screen.getByRole('button', { name: 'Open email to send feedback' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Your feedback'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open email to send feedback' }))

    expect(window.location.href).toBe('')
  })

  it('tells the user their email app will open, before they submit', () => {
    render(<FeedbackForm />)

    expect(screen.getByText(/opens your email app/i)).toBeInTheDocument()
    expect(screen.getByText(/hello\.onehourai@gmail\.com/)).toBeInTheDocument()
  })
})

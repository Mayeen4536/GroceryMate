import { useEffect, useState } from 'react'
import { ATTACHMENT_DEFAULTS, VOICE_TRANSCRIPT } from '@/constants/assistantContent'
import type { SuggestionKind } from '@/types/assistant'

/** An attachment the prompt composer is holding onto (a pasted receipt or an uploaded photo). */
export interface Attachment {
  id: 'receipt' | 'image'
  name: string
}

type Phase = 'idle' | 'thinking' | 'generating' | 'done'

const THINKING_DURATION = 1300

/**
 * Owns the Assistant feature's state machine: the prompt/attachments/voice
 * input, and the idle -> thinking -> generating -> done phase timers.
 */
export function useAssistant() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [listening, setListening] = useState(false)

  const toggleAttachment = (id: Attachment['id']) => {
    setAttachments((current) => {
      if (current.some((attachment) => attachment.id === id)) {
        return current.filter((attachment) => attachment.id !== id)
      }
      return [...current, { id, name: ATTACHMENT_DEFAULTS[id] }]
    })
  }

  const toggleVoice = () => setListening((current) => !current)

  // Voice input auto-stops and fills the prompt with a canned "transcript".
  useEffect(() => {
    if (!listening) return
    const timer = setTimeout(() => {
      setPrompt((current) => (current ? `${current} ${VOICE_TRANSCRIPT}` : VOICE_TRANSCRIPT))
      setListening(false)
    }, 1600)
    return () => clearTimeout(timer)
  }, [listening])

  // The "thinking" beat hands off to the step-by-step generation sequence.
  useEffect(() => {
    if (phase !== 'thinking') return
    const timer = setTimeout(() => setPhase('generating'), THINKING_DURATION)
    return () => clearTimeout(timer)
  }, [phase])

  const handleSuggestion = (kind: SuggestionKind) => {
    if (kind === 'text') {
      setPrompt('Plan a week of groceries for 4 people')
    } else if (kind === 'voice') {
      setListening(true)
    } else {
      toggleAttachment(kind)
    }
  }

  const resetToIdle = () => {
    setPhase('idle')
    setPrompt('')
    setAttachments([])
    setListening(false)
  }

  return {
    phase,
    setPhase,
    prompt,
    setPrompt,
    attachments,
    toggleAttachment,
    listening,
    toggleVoice,
    handleSuggestion,
    resetToIdle,
  }
}

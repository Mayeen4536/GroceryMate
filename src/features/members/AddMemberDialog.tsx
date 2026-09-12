import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Dices, Send, UserPlus } from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Input,
  MEMBER_TONES,
  Modal,
  SegmentedControl,
  SwatchPicker,
} from '@/components/ui'
import { springPop, springSnappy } from '@/animations/motion'
import { useHousehold } from '@/household/useHousehold'
import type { AddMemberTab, NewMemberDraft } from '@/hooks/useMembers'

interface AddMemberDialogProps {
  open: boolean
  initialTab: AddMemberTab
  onClose: () => void
  onAdd: (draft: NewMemberDraft) => Promise<{ error?: string }>
  onInvite: (email: string) => Promise<{ error?: string }>
}

const INVITE_LINK = 'grocerymate.app/join/flat-4b'

// Deliberately simple (not full RFC 5322): local@domain.tld, no whitespace. Good
// enough to reject obvious garbage without pretending to verify deliverability.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AddMemberDialog({ open, initialTab, onClose, onAdd, onInvite }: AddMemberDialogProps) {
  const { household } = useHousehold()
  const [tab, setTab] = useState<AddMemberTab>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tone, setTone] = useState(2)
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [nameAttempted, setNameAttempted] = useState(false)
  const [inviteAttempted, setInviteAttempted] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [addError, setAddError] = useState<string>()
  const [inviteError, setInviteError] = useState<string>()

  // Both toasts auto-dismiss on a timer; tracked here so closing the dialog
  // mid-timer (or unmounting) cancels it instead of setting state on a gone component.
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inviteSentTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => {
      clearTimeout(copiedTimer.current)
      clearTimeout(inviteSentTimer.current)
    }
  }, [])

  // Reset per open; keyed by `open` from the parent via remount.
  const shuffleTone = () => {
    const next = (tone + 1 + Math.floor(Math.random() * (MEMBER_TONES.length - 1))) % MEMBER_TONES.length
    setTone(next)
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(INVITE_LINK).catch(() => undefined)
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 1600)
  }

  const handleAdd = async () => {
    if (addSubmitting) return // belt-and-suspenders against a double Enter+click race; disabled below is the primary guard
    if (!name.trim()) {
      setNameAttempted(true)
      return
    }
    setAddSubmitting(true)
    setAddError(undefined)
    const result = await onAdd({ name: name.trim(), email: email.trim(), tone })
    setAddSubmitting(false)
    if (result.error) {
      setAddError(result.error)
      return
    }
    // onClose() is called by the parent once the new member is confirmed
    // persisted (see MembersPage's closeDialog) — no local close here.
  }

  const handleInvite = async () => {
    if (inviteSubmitting) return
    const trimmed = inviteEmail.trim()
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
      setInviteAttempted(true)
      return
    }
    setInviteSubmitting(true)
    setInviteError(undefined)
    const result = await onInvite(trimmed)
    setInviteSubmitting(false)
    if (result.error) {
      setInviteError(result.error)
      return
    }
    setInviteSent(true)
    setInviteAttempted(false)
    setInviteEmail('')
    clearTimeout(inviteSentTimer.current)
    inviteSentTimer.current = setTimeout(() => setInviteSent(false), 2200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Grow the household">
      <div className="mb-5 flex justify-center">
        <SegmentedControl
          aria-label="How to add this member"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'add', label: 'New member' },
            { value: 'invite', label: 'Invite link' },
          ]}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'add' ? (
          <motion.div
            key="add"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {addError && (
              <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                {addError}
              </p>
            )}

            <div className="flex flex-col items-center gap-3">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={tone}
                  initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: 20, opacity: 0 }}
                  transition={springSnappy}
                >
                  <Avatar name={name || '?'} tone={tone} size="lg" />
                </motion.span>
              </AnimatePresence>
              <Button variant="ghost" size="sm" iconLeft={Dices} onClick={shuffleTone} disabled={addSubmitting}>
                Shuffle look
              </Button>
            </div>

            <Input
              label="Name"
              placeholder="e.g. Omar Siddiqui"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={nameAttempted && !name.trim() ? 'Enter a name for this member.' : undefined}
              disabled={addSubmitting}
            />
            <Input
              label="Email"
              type="email"
              placeholder="omar@flat4b.home"
              helperText="Just a placeholder for now; invites go live later."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={addSubmitting}
            />
            <SwatchPicker
              label="Color theme"
              options={MEMBER_TONES.map((memberTone, index) => ({
                id: index,
                dot: memberTone.dot,
                label: `Color theme ${index + 1}`,
              }))}
              value={tone}
              onChange={setTone}
            />

            <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={onClose} disabled={addSubmitting}>
                Cancel
              </Button>
              <Button iconLeft={UserPlus} onClick={handleAdd} disabled={addSubmitting}>
                {addSubmitting ? 'Adding…' : 'Add member'}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="invite"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-5"
          >
            {inviteError && (
              <p role="alert" className="rounded-lg bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                {inviteError}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Household link</span>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={INVITE_LINK}
                  className="h-11 w-full rounded-md border border-line-strong bg-sand/60 px-3.5 text-sm text-ink-soft focus:outline-none"
                />
                <Button
                  variant="secondary"
                  iconLeft={copied ? Check : Copy}
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-muted">Anyone with the link can join {household?.name ?? 'this household'}.</p>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
              <span className="h-px flex-1 bg-line" />
              or send it for them
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex items-end gap-2">
              <Input
                label="Email"
                type="email"
                placeholder="fatima@flat4b.home"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                error={
                  inviteAttempted && !inviteEmail.trim()
                    ? 'Enter an email to invite.'
                    : inviteAttempted && !EMAIL_PATTERN.test(inviteEmail.trim())
                      ? 'Enter a valid email address.'
                      : undefined
                }
                className="flex-1"
                disabled={inviteSubmitting}
              />
              <Button iconLeft={Send} onClick={handleInvite} className="shrink-0" disabled={inviteSubmitting}>
                {inviteSubmitting ? 'Sending…' : 'Send invite'}
              </Button>
            </div>

            <div className="flex min-h-7 items-center justify-center">
              <AnimatePresence>
                {inviteSent && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: springPop }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Badge tone="success" icon={Check}>
                      Invite on its way
                    </Badge>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Dices, UserPlus } from 'lucide-react'
import { Avatar, Button, Input, MEMBER_TONES, Modal, SegmentedControl, SwatchPicker } from '@/components/ui'
import { springSnappy } from '@/animations/motion'
import { useHousehold } from '@/household/useHousehold'
import { createHouseholdInvite } from '@/invite/inviteService'
import { joinPath } from '@/invite/routes'
import type { AddMemberTab, NewMemberDraft } from '@/hooks/useMembers'

interface AddMemberDialogProps {
  open: boolean
  initialTab: AddMemberTab
  onClose: () => void
  onAdd: (draft: NewMemberDraft) => Promise<{ error?: string }>
}

/** Human-readable "expires in N days" from a real `expires_at` timestamp — never a hardcoded "7 days". */
function formatExpiry(expiresAt: string): string {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Expires soon'
  return days === 1 ? 'Expires in 1 day' : `Expires in ${days} days`
}

export function AddMemberDialog({ open, initialTab, onClose, onAdd }: AddMemberDialogProps) {
  const { household } = useHousehold()
  const [tab, setTab] = useState<AddMemberTab>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tone, setTone] = useState(2)
  const [copied, setCopied] = useState(false)
  const [nameAttempted, setNameAttempted] = useState(false)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string>()

  // A fresh, real, single-use link — generated once per dialog-open on the
  // invite tab (the parent only mounts this component while `open`, so a
  // close+reopen naturally requests a new one; the old one simply expires
  // in 7 days if unused, matching the backend's own single-use design —
  // see docs/INVITE_JOIN_DESIGN.md).
  const [inviteUrl, setInviteUrl] = useState<string>()
  const [inviteExpiry, setInviteExpiry] = useState<string>()
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string>()
  const inviteRequestedFor = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (tab !== 'invite' || !household?.id || inviteRequestedFor.current === household.id) return
    inviteRequestedFor.current = household.id
    setInviteLoading(true)
    setInviteError(undefined)
    createHouseholdInvite(household.id).then((result) => {
      setInviteLoading(false)
      if (result.error || !result.invite) {
        setInviteError(result.error ?? 'Something went wrong.')
        return
      }
      setInviteUrl(`${window.location.origin}${joinPath(result.invite.token)}`)
      setInviteExpiry(formatExpiry(result.invite.expiresAt))
    })
  }, [tab, household?.id])

  // The copy toast auto-dismisses on a timer; tracked here so closing the
  // dialog mid-timer (or unmounting) cancels it instead of setting state on
  // a gone component.
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    return () => clearTimeout(copiedTimer.current)
  }, [])

  // Reset per open; keyed by `open` from the parent via remount.
  const shuffleTone = () => {
    const next = (tone + 1 + Math.floor(Math.random() * (MEMBER_TONES.length - 1))) % MEMBER_TONES.length
    setTone(next)
  }

  const handleCopy = () => {
    if (!inviteUrl) return
    navigator.clipboard?.writeText(inviteUrl).catch(() => undefined)
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
              <Button
                variant="ghost"
                size="sm"
                iconLeft={Dices}
                onClick={shuffleTone}
                disabled={addSubmitting}
              >
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  aria-label="Invite link"
                  value={inviteLoading ? 'Generating your invite link…' : (inviteUrl ?? '')}
                  className="h-11 min-w-0 flex-1 truncate rounded-md border border-line-strong bg-sand/60 px-3.5 text-sm text-ink-soft focus:outline-none"
                />
                <Button
                  variant="secondary"
                  iconLeft={copied ? Check : Copy}
                  onClick={handleCopy}
                  disabled={!inviteUrl}
                  className="shrink-0"
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-sm text-muted">
                {inviteExpiry
                  ? `${inviteExpiry} · anyone with this link can join`
                  : 'Anyone with this link can join'}{' '}
                {household?.name ?? 'this household'}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

import { useState } from 'react'
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
} from '../../components/ui'
import { springPop, springSnappy } from '../../lib/motion'
import { AccentPicker } from './AccentPicker'

export type AddMemberTab = 'add' | 'invite'

export interface NewMemberDraft {
  name: string
  email: string
  tone: number
}

interface AddMemberDialogProps {
  open: boolean
  initialTab: AddMemberTab
  onClose: () => void
  onAdd: (draft: NewMemberDraft) => void
  onInvite: (email: string) => void
}

const INVITE_LINK = 'grocerymate.app/join/flat-4b'

export function AddMemberDialog({ open, initialTab, onClose, onAdd, onInvite }: AddMemberDialogProps) {
  const [tab, setTab] = useState<AddMemberTab>(initialTab)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tone, setTone] = useState(2)
  const [inviteEmail, setInviteEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  // Reset per open; keyed by `open` from the parent via remount.
  const shuffleTone = () => {
    const next = (tone + 1 + Math.floor(Math.random() * (MEMBER_TONES.length - 1))) % MEMBER_TONES.length
    setTone(next)
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(INVITE_LINK).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), email: email.trim(), tone })
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    onInvite(inviteEmail.trim())
    setInviteSent(true)
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 2200)
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
              <Button variant="ghost" size="sm" iconLeft={Dices} onClick={shuffleTone}>
                Shuffle look
              </Button>
            </div>

            <Input
              label="Name"
              placeholder="e.g. Omar Siddiqui"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="omar@flat4b.home"
              helperText="Just a placeholder for now; invites go live later."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <AccentPicker label="Color theme" value={tone} onChange={setTone} />

            <div className="mt-1 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button iconLeft={UserPlus} disabled={!name.trim()} onClick={handleAdd}>
                Add member
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
              <p className="text-sm text-muted">Anyone with the link can join Flat 4B.</p>
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
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                className="flex-1"
              />
              <Button
                iconLeft={Send}
                disabled={!inviteEmail.trim()}
                onClick={handleInvite}
                className="shrink-0"
              >
                Send invite
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

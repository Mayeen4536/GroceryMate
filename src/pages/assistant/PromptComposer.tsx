import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardPaste, FileImage, ImagePlus, Mic, Receipt, Sparkles, Wand2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'
import { springPop, springSnappy } from '../../lib/motion'

export interface Attachment {
  id: 'receipt' | 'image'
  name: string
}

const ATTACHMENT_ICON: Record<Attachment['id'], LucideIcon> = {
  receipt: Receipt,
  image: FileImage,
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      transition={springSnappy}
      className={cn(
        'relative flex size-10 items-center justify-center rounded-md transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        active
          ? 'bg-brand-600/10 text-brand-700'
          : 'text-ink-soft hover:bg-ink/[0.05] hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          aria-hidden="true"
          initial={{ scale: 0.7, opacity: 0.55 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
          className="absolute inset-0 rounded-md bg-brand-500/25"
        />
      )}
      <Icon size={18} aria-hidden="true" className="relative" />
    </motion.button>
  )
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: () => void
}) {
  const Icon = ATTACHMENT_ICON[attachment.id]
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={springPop}
      className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-line"
    >
      <Icon size={13} aria-hidden="true" className="text-brand-700" />
      {attachment.name}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="ml-0.5 rounded-full p-0.5 text-muted transition-colors hover:bg-ink/10 hover:text-ink"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </motion.span>
  )
}

interface PromptComposerProps {
  value: string
  onChange: (value: string) => void
  attachments: Attachment[]
  onToggleAttachment: (id: Attachment['id']) => void
  listening: boolean
  onToggleVoice: () => void
  onGenerate: () => void
}

/** The hero prompt box: textarea, attachments, and the voice / receipt / image toolbar. */
export function PromptComposer({
  value,
  onChange,
  attachments,
  onToggleAttachment,
  listening,
  onToggleVoice,
  onGenerate,
}: PromptComposerProps) {
  const id = useId()
  const canGenerate = value.trim().length > 0 || attachments.length > 0

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 left-1/2 h-56 w-[34rem] -translate-x-1/2 rounded-full bg-linear-to-r from-brand-400/15 via-mint-300/20 to-warning-400/10 blur-3xl"
      />
      <div className="card-surface relative overflow-hidden rounded-2xl p-5 shadow-panel sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-brand-700">
          <Sparkles size={16} aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">Ask GroceryMate</span>
        </div>

        <label htmlFor={id} className="sr-only">
          Describe what your household needs
        </label>
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Tell me what your household needs this week…"
          className="w-full resize-none border-0 bg-transparent text-base leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
        />

        <AnimatePresence>
          {listening && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-700"
            >
              <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <motion.span
                    key={index}
                    className="h-3.5 w-1 origin-bottom rounded-full bg-brand-500"
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 0.7,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.12,
                    }}
                  />
                ))}
              </span>
              Listening…
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div layout className="mb-1 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => onToggleAttachment(attachment.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={Mic}
              label={listening ? 'Stop listening' : 'Voice input'}
              active={listening}
              onClick={onToggleVoice}
            />
            <ToolbarButton
              icon={ClipboardPaste}
              label="Paste receipt"
              active={attachments.some((a) => a.id === 'receipt')}
              onClick={() => onToggleAttachment('receipt')}
            />
            <ToolbarButton
              icon={ImagePlus}
              label="Upload image"
              active={attachments.some((a) => a.id === 'image')}
              onClick={() => onToggleAttachment('image')}
            />
          </div>
          <Button iconLeft={Wand2} disabled={!canGenerate} onClick={onGenerate}>
            Generate
          </Button>
        </div>
      </div>
    </div>
  )
}

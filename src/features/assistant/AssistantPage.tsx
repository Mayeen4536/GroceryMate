import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { AIThinking, GeneratingSteps } from '@/components/experience'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { riseChild, transitionBase } from '@/animations/motion'
import { useAssistant } from '@/hooks/useAssistant'
import type { Attachment } from '@/hooks/useAssistant'
import { MOCK_GENERATED_ITEMS } from '@/store/assistantGenerated'
import { PromptComposer } from './PromptComposer'
import { ExamplePrompts } from './ExamplePrompts'
import { SuggestionGrid } from './SuggestionGrid'
import { GeneratedGroceries } from './GeneratedGroceries'

/** Small echo of what was asked, shown once the composer steps aside for the animation. */
function PromptRecap({ prompt, attachments }: { prompt: string; attachments: Attachment[] }) {
  return (
    <div className="card-surface flex items-start gap-3 rounded-xl px-4 py-3.5 shadow-soft">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-700">
        <Sparkles size={15} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-soft">
          {prompt || 'Using what you attached below…'}
        </p>
        {attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[0.6875rem] font-medium text-ink-soft"
              >
                {attachment.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The AI Assistant experience: a prompt composer with voice / receipt / image
 * input, example prompts and suggestions, and a fully mocked generation flow
 * (thinking, step-by-step progress, then a results reveal). No AI is
 * connected - every transition here runs on local timers and state.
 */
export function AssistantPage({
  direction = 1,
  onAddGroceries,
}: {
  direction?: number
  onAddGroceries: () => void
}) {
  const {
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
  } = useAssistant()

  return (
    <PageTransition direction={direction}>
      <motion.div variants={riseChild}>
        <PageHeader
          title="AI Assistant"
          description="Describe what your household needs, paste a receipt, or just say it - GroceryMate turns it into a ready-to-review grocery list."
          icon={Sparkles}
        />
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={transitionBase}
            className="space-y-10"
          >
            <div className="space-y-4">
              <PromptComposer
                value={prompt}
                onChange={setPrompt}
                attachments={attachments}
                onToggleAttachment={toggleAttachment}
                listening={listening}
                onToggleVoice={toggleVoice}
                onGenerate={() => setPhase('thinking')}
              />
              <ExamplePrompts onSelect={setPrompt} />
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">
                  Or try it another way
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Four ways to tell GroceryMate what you need.
                </p>
              </div>
              <SuggestionGrid onSelect={handleSuggestion} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="working"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={transitionBase}
            className="space-y-6"
          >
            <PromptRecap prompt={prompt} attachments={attachments} />

            <AnimatePresence mode="wait" initial={false}>
              {phase === 'thinking' && (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transitionBase}
                >
                  <AIThinking />
                </motion.div>
              )}

              {phase === 'generating' && (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transitionBase}
                >
                  <GeneratingSteps onComplete={() => setPhase('done')} />
                </motion.div>
              )}

              {phase === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transitionBase}
                >
                  <GeneratedGroceries
                    items={MOCK_GENERATED_ITEMS}
                    onAddGroceries={onAddGroceries}
                    onReset={resetToIdle}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

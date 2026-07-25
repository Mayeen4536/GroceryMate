import { Drawer } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { AboutContent } from './AboutContent'
import { PrivacyContent } from './PrivacyContent'
import { FeedbackForm } from './FeedbackForm'

export type InfoVariant = 'about' | 'privacy' | 'feedback'

const TITLES: Record<InfoVariant, string> = {
  about: 'About GroceryMate',
  privacy: 'Privacy',
  feedback: 'Send feedback',
}

interface InfoDrawerProps {
  variant: InfoVariant | null
  onClose: () => void
}

/** Shared drawer for the Support section rows: About, Feedback, and Privacy. */
export function InfoDrawer({ variant, onClose }: InfoDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <Drawer
      open={variant != null}
      onClose={onClose}
      title={variant ? TITLES[variant] : 'Details'}
      side={isDesktop ? 'right' : 'bottom'}
      panelClassName="sm:max-w-md"
    >
      {variant === 'about' && <AboutContent />}
      {variant === 'privacy' && <PrivacyContent />}
      {variant === 'feedback' && <FeedbackForm key="feedback" />}
    </Drawer>
  )
}

import { MotionConfig } from 'framer-motion'
import { DesignSystemShowcase } from './showcase/DesignSystemShowcase'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <DesignSystemShowcase />
    </MotionConfig>
  )
}

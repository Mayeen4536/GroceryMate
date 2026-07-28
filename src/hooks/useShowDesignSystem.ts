import { useEffect, useState } from 'react'

/** The design-system showcase stays reachable at /#design-system for component review. */
export function useShowDesignSystem(): boolean {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return hash === '#design-system'
}

import { useEffect, useState } from 'react'

/** Tracks a CSS media query, e.g. useMediaQuery('(min-width: 1024px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const onChange = () => setMatches(mediaQueryList.matches)
    onChange()
    mediaQueryList.addEventListener('change', onChange)
    return () => mediaQueryList.removeEventListener('change', onChange)
  }, [query])

  return matches
}

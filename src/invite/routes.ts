/**
 * The only shape of internal path this app ever treats as a safe
 * post-auth redirect target — see App.tsx (route detection) and
 * SignInPage/SignUpPage (return-destination handling). Deliberately not a
 * general-purpose "redirect to anything" allowlist: scoping this to the
 * one real case (returning to an invite) is what makes an open redirect
 * structurally impossible, not just filtered.
 */
const JOIN_PATH_PATTERN = /^\/join\/[^/?#]+$/

export function joinPath(token: string): string {
  return `/join/${token}`
}

/** Returns the raw token from a `/join/:token` pathname, or null if it isn't one. */
export function extractJoinToken(pathname: string): string | null {
  if (!JOIN_PATH_PATTERN.test(pathname)) return null
  return pathname.slice('/join/'.length)
}

/**
 * True only for our own `/join/:token` shape. Used to validate a
 * client-supplied `?redirect=` query value before ever passing it to
 * `navigate()` — anything else (an absolute URL, `//evil.com`, a different
 * internal path) is rejected rather than sanitized, since this app has
 * exactly one legitimate redirect destination today.
 */
export function isSafeJoinRedirect(path: string | null): path is string {
  return path != null && JOIN_PATH_PATTERN.test(path)
}

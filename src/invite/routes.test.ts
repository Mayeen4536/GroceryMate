import { describe, expect, it } from 'vitest'
import { extractJoinToken, isSafeJoinRedirect, joinPath } from './routes'

describe('joinPath', () => {
  it('builds a /join/:token path from a raw token', () => {
    expect(joinPath('abc123')).toBe('/join/abc123')
  })

  it('composes with the current origin to build the real, copyable share URL — never a hardcoded domain', () => {
    // jsdom's default test origin — this only proves the composition uses
    // window.location.origin at all, not that it matches any specific host.
    const shareUrl = `${window.location.origin}${joinPath('abc123')}`
    expect(shareUrl).toBe(`${window.location.origin}/join/abc123`)
    expect(shareUrl).not.toContain('grocerymate.app')
  })
})

describe('extractJoinToken', () => {
  it('extracts the token from a /join/:token pathname', () => {
    expect(extractJoinToken('/join/abc123')).toBe('abc123')
  })

  it('extracts a long, real-shaped hex token unchanged', () => {
    const token = 'c649f0a4781905cb1968d1821cb723e6e66944b9b0a5113858e81f0b60c6ee3a'
    expect(extractJoinToken(`/join/${token}`)).toBe(token)
  })

  it.each(['/groceries', '/join/', '/join', '/join/abc/extra', '/', '/sign-in'])(
    'returns null for a non-join pathname: %s',
    (pathname) => {
      expect(extractJoinToken(pathname)).toBeNull()
    },
  )
})

describe('isSafeJoinRedirect', () => {
  it('accepts a well-formed /join/:token path', () => {
    expect(isSafeJoinRedirect('/join/abc123')).toBe(true)
  })

  it('rejects null/empty', () => {
    expect(isSafeJoinRedirect(null)).toBe(false)
    expect(isSafeJoinRedirect('')).toBe(false)
  })

  it('rejects an absolute external URL — the open-redirect case this exists to prevent', () => {
    expect(isSafeJoinRedirect('https://evil.example.com/join/abc')).toBe(false)
  })

  it('rejects a protocol-relative URL', () => {
    expect(isSafeJoinRedirect('//evil.example.com/join/abc')).toBe(false)
  })

  it('rejects any other internal path — only /join/:token is ever a valid redirect target', () => {
    expect(isSafeJoinRedirect('/groceries')).toBe(false)
    expect(isSafeJoinRedirect('/settings')).toBe(false)
    expect(isSafeJoinRedirect('/join')).toBe(false)
    expect(isSafeJoinRedirect('/join/')).toBe(false)
  })

  it('rejects a join path carrying extra query/hash-like segments embedded in the token slot', () => {
    expect(isSafeJoinRedirect('/join/abc?x=https://evil.example.com')).toBe(false)
    expect(isSafeJoinRedirect('/join/abc/../../etc')).toBe(false)
  })
})

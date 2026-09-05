import { useContext } from 'react'
import { AuthContext } from './AuthContext'

/** Session, profile, and auth actions. Must be used within <AuthProvider>. */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within <AuthProvider>')
  return value
}

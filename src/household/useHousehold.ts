import { useContext } from 'react'
import { HouseholdContext } from './HouseholdContext'

/** Current household, membership, and lifecycle actions. Must be used within <HouseholdProvider>. */
export function useHousehold() {
  const value = useContext(HouseholdContext)
  if (!value) throw new Error('useHousehold must be used within <HouseholdProvider>')
  return value
}

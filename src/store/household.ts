import type { MockHousehold, MockUser } from '@/types/household'

/**
 * Mock data for visual display only. Nothing here is persisted or
 * calculated; it exists so the shell has something realistic to show.
 */
export const mockUser: MockUser = {
  name: 'Aisha Khan',
  email: 'aisha@example.com',
}

export const mockHousehold: MockHousehold = {
  id: 'flat-4b',
  name: 'Flat 4B',
  memberCount: 4,
}

export const mockMembers: string[] = ['Aisha Khan', 'Bilal Ahmed', 'Chloe Lee', 'Daniyal Raza']

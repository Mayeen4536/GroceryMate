/**
 * Mock data for visual display only. Nothing here is persisted or
 * calculated; it exists so the shell has something realistic to show.
 */

export interface MockUser {
  name: string
  email: string
}

export interface MockHousehold {
  id: string
  name: string
  memberCount: number
}

export const mockUser: MockUser = {
  name: 'Aisha Khan',
  email: 'aisha@example.com',
}

export const mockHousehold: MockHousehold = {
  id: 'flat-4b',
  name: 'Flat 4B',
  memberCount: 4,
}

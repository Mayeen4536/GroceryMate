/**
 * Mock data types for visual display only. Nothing here is persisted or
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

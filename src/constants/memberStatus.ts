import type { BadgeTone } from '@/components/ui'
import type { MemberStatus } from '@/types/member'

export const STATUS_META: Record<MemberStatus, { label: string; tone: BadgeTone }> = {
  settled: { label: 'Settled up', tone: 'success' },
  owes: { label: 'Owes the house', tone: 'warning' },
  owed: { label: 'House owes', tone: 'mint' },
  invited: { label: 'Invite pending', tone: 'neutral' },
}

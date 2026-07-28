import type { NotificationSetting } from '@/types/settings'

export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: 'push',
    label: 'Push notifications',
    description: 'Get notified when someone adds groceries or settles up.',
  },
  {
    key: 'reminders',
    label: 'Settlement reminders',
    description: 'Nudge members who still owe the house.',
  },
  {
    key: 'digest',
    label: 'Weekly summary',
    description: "A Sunday recap of what your household spent.",
  },
]

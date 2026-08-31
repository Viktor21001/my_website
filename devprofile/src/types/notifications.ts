export type NotificationType =
  | 'FRIEND_REQUEST_RECEIVED'
  | 'FRIEND_REQUEST_ACCEPTED'
  | 'GROUP_JOIN_REQUEST'
  | 'GROUP_JOIN_APPROVED'
  | 'GROUP_POST_COMMENT'
  | 'GROUP_POST_LIKE'
  | 'REPORT_RESOLVED'

export interface NotificationEntry {
  id: string
  type: NotificationType
  payload: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

export interface NotificationsPage {
  notifications: NotificationEntry[]
  nextCursor: string | null
}

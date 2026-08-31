import type { PublicUser } from './social'

export interface FriendEntry {
  friendshipId: string
  user: PublicUser
  since: string | null
}

export interface FriendsPage {
  friends: FriendEntry[]
  nextCursor: string | null
}

export type FriendRequestDirection = 'incoming' | 'outgoing'

export interface FriendRequestEntry {
  id: string
  user: PublicUser
  message: string | null
  createdAt: string
}

export interface FriendRequestsPage {
  requests: FriendRequestEntry[]
  nextCursor: string | null
}

export interface SendFriendRequestPayload {
  addresseeId: string
  message?: string
}

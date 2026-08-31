import type { PublicUser } from './social'

export type GroupPrivacy = 'PUBLIC' | 'PRIVATE'
export type GroupMemberRole = 'OWNER' | 'MODERATOR' | 'MEMBER'
export type GroupMemberStatus = 'PENDING' | 'MEMBER'

export interface GroupSummary {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  privacy: GroupPrivacy
  memberCount: number
  // null — я вообще не в этой группе (ни участник, ни заявка)
  myRole: GroupMemberRole | null
  myStatus: GroupMemberStatus | null
}

export interface GroupDetail extends GroupSummary {
  ownerUsername: string
  conversationId: string | null
}

export interface GroupsPage {
  groups: GroupSummary[]
  nextCursor: string | null
}

export interface CreateGroupPayload {
  name: string
  description?: string
  privacy?: GroupPrivacy
}

export interface UpdateGroupPayload {
  name?: string
  description?: string
  privacy?: GroupPrivacy
  avatar?: string | null
}

export interface GroupMemberEntry {
  id: string
  user: PublicUser
  role: GroupMemberRole
  joinedAt: string
}

export interface GroupMembersPage {
  members: GroupMemberEntry[]
  nextCursor: string | null
}

export interface GroupJoinRequestEntry {
  id: string
  user: PublicUser
  requestedAt: string
}

export interface GroupPostEntry {
  id: string
  groupId: string
  authorId: string | null
  authorUsername: string
  body: string
  createdAt: string
  commentCount: number
  likeCount: number
  likedByMe: boolean
}

export interface GroupPostsPage {
  posts: GroupPostEntry[]
  nextCursor: string | null
}

export interface GroupCommentEntry {
  id: string
  postId: string
  authorId: string | null
  authorUsername: string
  body: string
  createdAt: string
}

export interface GroupCommentsPage {
  comments: GroupCommentEntry[]
  nextCursor: string | null
}

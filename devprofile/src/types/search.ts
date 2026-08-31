import type { PublicUser } from './social'
import type { GroupSummary } from './groups'

export interface SearchResults {
  users: PublicUser[]
  usersNextCursor: string | null
  groups: GroupSummary[]
  groupsNextCursor: string | null
}

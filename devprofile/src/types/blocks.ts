import type { PublicUser } from './social'

export interface BlockEntry {
  id: string
  user: PublicUser
  createdAt: string
}

export interface BlocksPage {
  blocks: BlockEntry[]
  nextCursor: string | null
}

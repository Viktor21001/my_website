import type { Role } from './auth'

export interface AdminUserRow {
  id: string
  email: string
  username: string
  displayName: string
  avatar: string | null
  role: Role
  createdAt: string
  bannedAt: string | null
  bannedUntil: string | null
  banReason: string | null
}

export interface AdminUsersPage {
  users: AdminUserRow[]
  nextCursor: string | null
}

export interface BanPayload {
  id: string
  days?: number
  reason: string
}

export type AdminAction =
  | 'BAN'
  | 'UNBAN'
  | 'DELETE_USER'
  | 'RESET_PASSWORD'
  | 'PROMOTE_ADMIN'
  | 'DEMOTE_ADMIN'
  | 'RESOLVE_REPORT'
  | 'REJECT_REPORT'

export interface AuditLogEntry {
  id: string
  actorId: string | null
  actorUsername: string
  targetId: string | null
  targetUsername: string | null
  action: AdminAction
  details: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogPage {
  entries: AuditLogEntry[]
  nextCursor: string | null
}

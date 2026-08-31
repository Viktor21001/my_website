export type ReportCategory = 'HARASSMENT' | 'SPAM' | 'SCAM' | 'INAPPROPRIATE_PROFILE' | 'OTHER'
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'REJECTED'
// Не Prisma-enum на сервере (простой String), но набор значений тот же
export type ReportResolutionAction = 'NO_ACTION' | 'WARNING' | 'BAN_TEMPORARY' | 'BAN_PERMANENT' | 'OTHER'

export interface ReportEntry {
  id: string
  reporterUsername: string
  reportedId: string | null
  reportedUsername: string
  category: ReportCategory
  description: string
  status: ReportStatus
  resolvedByUsername: string | null
  resolutionAction: ReportResolutionAction | null
  resolutionNote: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface ReportsPage {
  reports: ReportEntry[]
  nextCursor: string | null
}

export interface FileReportPayload {
  reportedUserId: string
  category: ReportCategory
  description: string
}

export interface ResolveReportPayload {
  id: string
  action: ReportResolutionAction
  note: string
  banDays?: number
}

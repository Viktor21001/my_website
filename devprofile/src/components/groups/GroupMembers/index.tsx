import { useEffect, useState } from 'react'
import {
  useLazyGetGroupMembersQuery, useLazyGetGroupRequestsQuery,
  useApproveGroupRequestMutation, useRejectGroupRequestMutation,
  usePromoteGroupMemberMutation, useDemoteGroupMemberMutation,
  useRemoveGroupMemberMutation, useLeaveGroupMutation,
} from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppSelector } from '../../../hooks/redux'
import { Avatar } from '../../shared/Avatar'
import type { GroupMemberEntry, GroupMemberRole, GroupJoinRequestEntry } from '../../../types/groups'

interface GroupMembersProps {
  groupId: string
  myRole: GroupMemberRole | null
  isPrivate: boolean
  onLeft: () => void
}

const ROLE_LABEL: Record<GroupMemberRole, string> = { OWNER: 'Владелец', MODERATOR: 'Модератор', MEMBER: 'Участник' }

export function GroupMembers({ groupId, myRole, isPrivate, onLeft }: GroupMembersProps) {
  const myId = useAppSelector((state) => state.auth.user?.id)
  const canModerate = myRole === 'OWNER' || myRole === 'MODERATOR'
  const isOwner = myRole === 'OWNER'

  const [rows, setRows] = useState<GroupMemberEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchMembers, { isFetching }] = useLazyGetGroupMembersQuery()

  const [requests, setRequests] = useState<GroupJoinRequestEntry[]>([])
  const [fetchRequests] = useLazyGetGroupRequestsQuery()

  useEffect(() => {
    let cancelled = false
    fetchMembers({ groupId })
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.members)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить список участников'))
      })
    return () => {
      cancelled = true
    }
  }, [groupId, fetchMembers])

  useEffect(() => {
    if (!canModerate || !isPrivate) return
    let cancelled = false
    fetchRequests(groupId)
      .unwrap()
      .then((result) => {
        if (!cancelled) setRequests(result.requests)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [groupId, canModerate, isPrivate, fetchRequests])

  function refreshMembers() {
    fetchMembers({ groupId })
      .unwrap()
      .then((result) => {
        setRows(result.members)
        setNextCursor(result.nextCursor)
      })
      .catch(() => {})
  }

  function refreshRequests() {
    fetchRequests(groupId)
      .unwrap()
      .then((result) => setRequests(result.requests))
      .catch(() => {})
  }

  function loadMore() {
    if (!nextCursor) return
    fetchMembers({ groupId, cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.members])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить список участников')))
  }

  return (
    <div className="flex flex-col gap-3">
      {canModerate && isPrivate && requests.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="dp-section-title" style={{ background: 'none', border: 'none', padding: 0 }}>Заявки на вступление</div>
          {requests.map((r) => (
            <RequestRow key={r.id} groupId={groupId} request={r} onChanged={() => { refreshRequests(); refreshMembers() }} />
          ))}
        </div>
      )}

      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((m) => (
          <MemberRow
            key={m.id} groupId={groupId} member={m} myId={myId} isOwner={isOwner} canModerate={canModerate}
            onChanged={refreshMembers}
            onLeft={onLeft}
          />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Пока пусто</div>
        )}
      </div>

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={isFetching}
          className="w-full text-xs py-2"
          style={{ background: 'none', border: 'none', borderTop: '1px solid var(--dp-border)', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
        >
          {isFetching ? 'Загружаем…' : 'Показать ещё'}
        </button>
      )}
    </div>
  )
}

function RequestRow({ groupId, request, onChanged }: { groupId: string; request: GroupJoinRequestEntry; onChanged: () => void }) {
  const [approve, { isLoading: approving }] = useApproveGroupRequestMutation()
  const [reject, { isLoading: rejecting }] = useRejectGroupRequestMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setError(null)
    try {
      await approve({ groupId, userId: request.user.id }).unwrap()
      onChanged()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось одобрить заявку'))
    }
  }

  async function handleReject() {
    setError(null)
    try {
      await reject({ groupId, userId: request.user.id }).unwrap()
      onChanged()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось отклонить заявку'))
    }
  }

  return (
    <div className="p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center gap-3">
        <Avatar src={request.user.avatar} name={request.user.displayName} size={32} background="var(--dp-bg-panel)" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{request.user.displayName}</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>@{request.user.username}</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={handleApprove} disabled={approving} className="dp-btn-primary text-xs">Принять</button>
          <button onClick={handleReject} disabled={rejecting} className="dp-btn-ghost text-xs">Отклонить</button>
        </div>
      </div>
      {error && <div className="dp-error mt-2">{error}</div>}
    </div>
  )
}

function MemberRow({
  groupId, member, myId, isOwner, canModerate, onChanged, onLeft,
}: {
  groupId: string
  member: GroupMemberEntry
  myId: string | undefined
  isOwner: boolean
  canModerate: boolean
  onChanged: () => void
  onLeft: () => void
}) {
  const [promote, { isLoading: promoting }] = usePromoteGroupMemberMutation()
  const [demote, { isLoading: demoting }] = useDemoteGroupMemberMutation()
  const [remove, { isLoading: removing }] = useRemoveGroupMemberMutation()
  const [leave, { isLoading: leaving }] = useLeaveGroupMutation()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMe = member.user.id === myId
  // Права на кнопки — то же правило, что сервер применяет в assertModerator/
  // ролевой иерархии routes/groups.ts: обычный MODERATOR не может тронуть
  // другого MODERATOR или OWNER
  const canManageThisMember = !isMe && member.role !== 'OWNER' && (canModerate) && (member.role !== 'MODERATOR' || isOwner)

  async function handlePromote() {
    setError(null)
    try {
      await promote({ groupId, userId: member.user.id }).unwrap()
      onChanged()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось выдать права модератора'))
    }
  }

  async function handleDemote() {
    setError(null)
    try {
      await demote({ groupId, userId: member.user.id }).unwrap()
      onChanged()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось забрать права модератора'))
    }
  }

  function handleRemoveClick() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      setTimeout(() => setConfirmRemove(false), 4000)
      return
    }
    setError(null)
    remove({ groupId, userId: member.user.id })
      .unwrap()
      .then(onChanged)
      .catch((err) => setError(extractApiError(err, 'Не удалось исключить участника')))
    setConfirmRemove(false)
  }

  async function handleLeave() {
    setError(null)
    try {
      await leave(groupId).unwrap()
      onLeft()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось покинуть группу'))
    }
  }

  return (
    <div className="p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center gap-3">
        <Avatar src={member.user.avatar} name={member.user.displayName} size={32} background="var(--dp-bg-panel)" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{member.user.displayName}</span>
            <RoleBadge role={member.role} />
          </div>
          <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>@{member.user.username}</div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {isMe && !isOwner && (
            <button onClick={handleLeave} disabled={leaving} className="dp-btn-ghost text-xs">Покинуть группу</button>
          )}
          {canManageThisMember && isOwner && member.role === 'MEMBER' && (
            <button onClick={handlePromote} disabled={promoting} className="dp-btn-ghost text-xs">В модераторы</button>
          )}
          {canManageThisMember && isOwner && member.role === 'MODERATOR' && (
            <button onClick={handleDemote} disabled={demoting} className="dp-btn-ghost text-xs">Забрать модератора</button>
          )}
          {canManageThisMember && (
            <button
              onClick={handleRemoveClick}
              disabled={removing}
              className="dp-btn-ghost text-xs"
              style={{ color: confirmRemove ? 'var(--dp-red)' : undefined, borderColor: confirmRemove ? 'var(--dp-red)' : undefined }}
            >
              {confirmRemove ? 'Точно исключить?' : 'Исключить'}
            </button>
          )}
        </div>
      </div>
      {error && <div className="dp-error mt-2">{error}</div>}
    </div>
  )
}

function RoleBadge({ role }: { role: GroupMemberRole }) {
  if (role === 'MEMBER') return null
  const color = role === 'OWNER' ? 'var(--dp-orange)' : 'var(--dp-accent)'
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}>
      {ROLE_LABEL[role]}
    </span>
  )
}

import { useEffect, useState } from 'react'
import {
  useLazyGetFriendRequestsQuery, useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation, useCancelFriendRequestMutation,
} from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { Avatar } from '../../shared/Avatar'
import { MyReportsList } from './MyReportsList'
import type { FriendRequestDirection, FriendRequestEntry } from '../../../types/friends'

type SubTab = FriendRequestDirection | 'reports'

export function RequestsTab() {
  const [subTab, setSubTab] = useState<SubTab>('incoming')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        <SubTabButton active={subTab === 'incoming'} onClick={() => setSubTab('incoming')}>Входящие</SubTabButton>
        <SubTabButton active={subTab === 'outgoing'} onClick={() => setSubTab('outgoing')}>Исходящие</SubTabButton>
        <SubTabButton active={subTab === 'reports'} onClick={() => setSubTab('reports')}>Мои жалобы</SubTabButton>
      </div>

      {subTab === 'reports' ? <MyReportsList /> : <FriendRequestsList direction={subTab} />}
    </div>
  )
}

function FriendRequestsList({ direction }: { direction: FriendRequestDirection }) {
  const [rows, setRows] = useState<FriendRequestEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchRequests, { isFetching }] = useLazyGetFriendRequestsQuery()

  useEffect(() => {
    let cancelled = false
    fetchRequests({ direction })
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.requests)
        setNextCursor(result.nextCursor)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить заявки'))
      })
    return () => {
      cancelled = true
    }
  }, [direction, fetchRequests])

  function loadMore() {
    if (!nextCursor) return
    fetchRequests({ direction, cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.requests])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить заявки')))
  }

  function refresh() {
    fetchRequests({ direction })
      .unwrap()
      .then((result) => {
        setRows(result.requests)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось обновить заявки')))
  }

  return (
    <div className="flex flex-col gap-3">
      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((entry) => (
          <RequestRow key={entry.id} entry={entry} direction={direction} onChanged={refresh} />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>
            {direction === 'incoming' ? 'Нет входящих заявок' : 'Нет исходящих заявок'}
          </div>
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

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-2.5 py-1 rounded-full"
      style={{
        background: active ? 'var(--dp-accent)' : 'transparent',
        color: active ? '#05141f' : 'var(--dp-text-secondary)',
        border: `1px solid ${active ? 'var(--dp-accent)' : 'var(--dp-border)'}`,
        cursor: 'pointer',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}

function RequestRow({
  entry, direction, onChanged,
}: {
  entry: FriendRequestEntry
  direction: FriendRequestDirection
  onChanged: () => void
}) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [acceptRequest, { isLoading: accepting }] = useAcceptFriendRequestMutation()
  const [declineRequest, { isLoading: declining }] = useDeclineFriendRequestMutation()
  const [cancelRequest, { isLoading: cancelling }] = useCancelFriendRequestMutation()

  async function handleAccept() {
    setActionError(null)
    try {
      await acceptRequest(entry.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось принять заявку'))
    }
  }

  async function handleDecline() {
    setActionError(null)
    try {
      await declineRequest(entry.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось отклонить заявку'))
    }
  }

  async function handleCancel() {
    setActionError(null)
    try {
      await cancelRequest(entry.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось отменить заявку'))
    }
  }

  return (
    <div className="p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center gap-3">
        <Avatar src={entry.user.avatar} name={entry.user.displayName} size={36} background="var(--dp-bg-panel)" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{entry.user.displayName}</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>@{entry.user.username}</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {direction === 'incoming' ? (
            <>
              <button onClick={handleAccept} disabled={accepting} className="dp-btn-primary text-xs">Принять</button>
              <button onClick={handleDecline} disabled={declining} className="dp-btn-ghost text-xs">Отклонить</button>
            </>
          ) : (
            <button onClick={handleCancel} disabled={cancelling} className="dp-btn-ghost text-xs">Отменить</button>
          )}
        </div>
      </div>
      {entry.message && (
        <div className="text-xs mt-2 p-2" style={{ background: 'var(--dp-bg-panel)', border: '1px solid var(--dp-border)', borderRadius: 6, color: 'var(--dp-text-secondary)' }}>
          «{entry.message}»
        </div>
      )}
      {actionError && <div className="dp-error mt-2">{actionError}</div>}
    </div>
  )
}

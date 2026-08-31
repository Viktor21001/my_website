/*
  NotificationBell — компактный дропдаун в шапке (не полноэкранный оверлей,
  в отличие от SocialHub/AdminPanel), тот же click-outside-закрывает
  паттерн, что уже в SearchBar.
*/

import { useEffect, useRef, useState } from 'react'
import {
  useGetUnreadNotificationCountQuery, useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation, useMarkAllNotificationsReadMutation,
} from '../../../store/api/backendApi'
import { useAppDispatch } from '../../../hooks/redux'
import { setSocialHubOpen, openGroup } from '../../../store/slices/uiSlice'
import type { NotificationEntry } from '../../../types/notifications'

const RESOLUTION_LABEL: Record<string, string> = {
  NO_ACTION: 'без действий',
  WARNING: 'предупреждение',
  BAN_TEMPORARY: 'временный бан',
  BAN_PERMANENT: 'постоянный бан',
  OTHER: 'другое действие',
}

function describe(n: NotificationEntry): string {
  const payload = n.payload ?? {}
  switch (n.type) {
    case 'FRIEND_REQUEST_RECEIVED': return 'Новая заявка в друзья'
    case 'FRIEND_REQUEST_ACCEPTED': return 'Вашу заявку в друзья приняли'
    case 'GROUP_JOIN_REQUEST': return 'Новая заявка на вступление в группу'
    case 'GROUP_JOIN_APPROVED': return 'Вашу заявку на вступление в группу одобрили'
    case 'GROUP_POST_COMMENT': return 'Новый комментарий к вашей записи на стене'
    case 'GROUP_POST_LIKE': return 'Кто-то оценил вашу запись на стене'
    case 'REPORT_RESOLVED': {
      if (payload.status === 'REJECTED') return `Жалоба отклонена: ${payload.note ?? ''}`
      const action = RESOLUTION_LABEL[payload.action as string] ?? String(payload.action ?? '')
      return `Жалоба рассмотрена (${action}): ${payload.note ?? ''}`
    }
    default: return 'Новое уведомление'
  }
}

function targetGroupId(n: NotificationEntry): string | null {
  const gid = n.payload?.groupId
  return typeof gid === 'string' ? gid : null
}

export function NotificationBell() {
  const dispatch = useAppDispatch()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { data: unreadData } = useGetUnreadNotificationCountQuery()
  const unreadCount = unreadData?.count ?? 0

  const [notifications, setNotifications] = useState<NotificationEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [fetchNotifications, { isFetching }] = useLazyGetNotificationsQuery()
  const [markRead] = useMarkNotificationReadMutation()
  const [markAllRead] = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleOpen() {
    const next = !isOpen
    setIsOpen(next)
    if (next) {
      fetchNotifications()
        .unwrap()
        .then((result) => {
          setNotifications(result.notifications)
          setNextCursor(result.nextCursor)
        })
        .catch(() => {})
    }
  }

  function loadMore() {
    if (!nextCursor) return
    fetchNotifications({ cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setNotifications((prev) => [...prev, ...result.notifications])
        setNextCursor(result.nextCursor)
      })
      .catch(() => {})
  }

  function handleNotificationClick(n: NotificationEntry) {
    if (!n.readAt) {
      markRead(n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
    }
    const groupId = targetGroupId(n)
    if (groupId) {
      dispatch(openGroup(groupId))
    } else if (n.type === 'FRIEND_REQUEST_RECEIVED' || n.type === 'FRIEND_REQUEST_ACCEPTED' || n.type === 'REPORT_RESOLVED') {
      dispatch(setSocialHubOpen(true))
    }
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button onClick={toggleOpen} className="dp-btn-ghost text-xs relative">
        🔔
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-[10px] font-bold rounded-full"
            style={{ minWidth: 16, height: 16, padding: '0 3px', background: 'var(--dp-red)', color: '#fff' }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 z-50 overflow-y-auto"
          style={{
            width: 320, maxHeight: 420,
            background: 'var(--dp-bg-panel)', border: '1px solid var(--dp-border-accent)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--dp-border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--dp-text-white)' }}>Уведомления</span>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  markAllRead()
                  setNotifications((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })))
                }}
                className="text-[10px]"
                style={{ background: 'none', border: 'none', color: 'var(--dp-accent)', cursor: 'pointer' }}
              >
                Прочитать всё
              </button>
            )}
          </div>

          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className="flex flex-col gap-0.5 px-3 py-2 w-full text-left"
              style={{
                background: n.readAt ? 'none' : 'var(--dp-bg-card-hover)',
                border: 'none', borderBottom: '1px solid var(--dp-border)', cursor: 'pointer',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--dp-text-primary)' }}>{describe(n)}</span>
              <span className="text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>{new Date(n.createdAt).toLocaleString('ru-RU')}</span>
            </button>
          ))}

          {notifications.length === 0 && !isFetching && (
            <div className="p-3 text-xs text-center" style={{ color: 'var(--dp-text-muted)' }}>Пока пусто</div>
          )}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={isFetching}
              className="w-full text-xs py-2"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
            >
              {isFetching ? 'Загружаем…' : 'Показать ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

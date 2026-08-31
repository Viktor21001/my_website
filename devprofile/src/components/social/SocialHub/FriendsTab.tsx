import { useEffect, useState } from 'react'
import { useLazyGetFriendsQuery, useRemoveFriendMutation, useStartDirectConversationMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppDispatch } from '../../../hooks/redux'
import { openConversation } from '../../../store/slices/uiSlice'
import { Avatar } from '../../shared/Avatar'
import type { FriendEntry } from '../../../types/friends'

export function FriendsTab() {
  const [rows, setRows] = useState<FriendEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchFriends, { isFetching }] = useLazyGetFriendsQuery()

  // Тот же паттерн, что UsersTab в AdminPanel — setState в .then() реального
  // запроса, а не синхронно в теле эффекта (react-hooks/set-state-in-effect)
  useEffect(() => {
    let cancelled = false
    fetchFriends()
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.friends)
        setNextCursor(result.nextCursor)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить список друзей'))
      })
    return () => {
      cancelled = true
    }
  }, [fetchFriends])

  function loadMore() {
    if (!nextCursor) return
    fetchFriends({ cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.friends])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить список друзей')))
  }

  // Тег-инвалидация не помогает локально накопленному state (тот же
  // известный по AdminPanel случай) — перезапрашиваем первую страницу
  function refresh() {
    fetchFriends()
      .unwrap()
      .then((result) => {
        setRows(result.friends)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось обновить список друзей')))
  }

  return (
    <div className="flex flex-col gap-3">
      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((entry) => (
          <FriendRow key={entry.friendshipId} entry={entry} onChanged={refresh} />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>
            Пока нет друзей
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

function FriendRow({ entry, onChanged }: { entry: FriendEntry; onChanged: () => void }) {
  const dispatch = useAppDispatch()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [removeFriend, { isLoading: removing }] = useRemoveFriendMutation()
  const [startConversation, { isLoading: opening }] = useStartDirectConversationMutation()

  function handleRemoveClick() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      setTimeout(() => setConfirmRemove(false), 4000)
      return
    }
    setActionError(null)
    removeFriend(entry.user.id)
      .unwrap()
      .then(onChanged)
      .catch((err) => setActionError(extractApiError(err, 'Не удалось удалить из друзей')))
    setConfirmRemove(false)
  }

  async function handleWrite() {
    setActionError(null)
    try {
      const result = await startConversation(entry.user.id).unwrap()
      dispatch(openConversation(result.conversation.id))
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось открыть чат'))
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
          <button onClick={handleWrite} disabled={opening} className="dp-btn-ghost text-xs">Написать</button>
          <button
            onClick={handleRemoveClick}
            disabled={removing}
            className="dp-btn-ghost text-xs"
            style={{ color: confirmRemove ? 'var(--dp-red)' : undefined, borderColor: confirmRemove ? 'var(--dp-red)' : undefined }}
          >
            {confirmRemove ? 'Точно удалить?' : 'Удалить из друзей'}
          </button>
        </div>
      </div>
      {actionError && <div className="dp-error mt-2">{actionError}</div>}
    </div>
  )
}

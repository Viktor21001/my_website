import { useEffect, useState } from 'react'
import {
  useGetConversationsQuery, useGetMessagesQuery, useLazyGetOlderMessagesQuery,
  useSendMessageMutation, useMarkConversationReadMutation,
} from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppSelector } from '../../../hooks/redux'
import { getSocket } from '../../../lib/socket'
import { Avatar } from '../../shared/Avatar'
import type { MessageEntry } from '../../../types/chat'

interface ChatThreadProps {
  conversationId: string
  onBack: () => void
  // Групповой чат (GroupDetail) переиспользует этот же компонент, но у
  // группы нет одного "otherUser" — передаём имя/аватар группы явно вместо
  // попытки резолвить их из getConversations (там otherUser всегда null
  // для type=GROUP). Присутствие (зелёная точка) в этом случае не показываем
  // — оно осмысленно только для одного конкретного собеседника.
  headerOverride?: { name: string; avatar: string | null }
}

export function ChatThread({ conversationId, onBack, headerOverride }: ChatThreadProps) {
  const myId = useAppSelector((state) => state.auth.user?.id)
  const { data: conversationsPage } = useGetConversationsQuery()
  const conversation = conversationsPage?.conversations.find((c) => c.id === conversationId)

  const { data, isFetching: loadingLatest } = useGetMessagesQuery(conversationId)
  const [olderMessages, setOlderMessages] = useState<MessageEntry[]>([])
  const [manualNoMoreOlder, setManualNoMoreOlder] = useState(false)
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyGetOlderMessagesQuery()
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation()
  const [markRead] = useMarkConversationReadMutation()
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  const [livePeerOnline, setLivePeerOnline] = useState<boolean | null>(null)

  // Открыли чат -> отметить прочитанным. Обычный побочный эффект (сетевой
  // запрос), не синхронное зеркалирование пропа в state — react-hooks/set-state-in-effect тут не при чём
  useEffect(() => {
    markRead(conversationId)
  }, [conversationId, markRead])

  useEffect(() => {
    const peerId = conversation?.otherUser?.id
    if (!peerId) return
    const socket = getSocket()
    if (!socket) return
    function onPresence(payload: { userId: string; online: boolean }) {
      if (payload.userId !== peerId) return
      setLivePeerOnline(payload.online)
    }
    socket.on('presence:update', onPresence)
    return () => {
      socket.off('presence:update', onPresence)
    }
  }, [conversation?.otherUser?.id])

  const allMessages = [...olderMessages, ...(data?.messages ?? [])]
  const noMoreOlderInitially = olderMessages.length === 0 && data?.nextCursor === null
  const showLoadOlder = allMessages.length > 0 && !manualNoMoreOlder && !noMoreOlderInitially
  const peerOnline = livePeerOnline ?? conversation?.otherUserOnline ?? false

  function loadOlder() {
    const oldest = allMessages[0]
    if (!oldest) return
    setHistoryError(null)
    fetchOlder({ conversationId, cursor: oldest.id })
      .unwrap()
      .then((result) => {
        setOlderMessages((prev) => [...result.messages, ...prev])
        if (result.nextCursor === null) setManualNoMoreOlder(true)
      })
      .catch((err) => setHistoryError(extractApiError(err, 'Не удалось загрузить историю')))
  }

  async function handleSend() {
    const body = draft.trim()
    if (!body) return
    setSendError(null)
    try {
      await sendMessage({ conversationId, body }).unwrap()
      setDraft('')
    } catch (err) {
      setSendError(extractApiError(err, 'Не удалось отправить сообщение'))
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 440 }}>
      <div className="flex items-center gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid var(--dp-border)' }}>
        <button onClick={onBack} className="dp-btn-ghost text-xs shrink-0">← Назад</button>
        {headerOverride ? (
          <>
            <Avatar src={headerOverride.avatar} name={headerOverride.name} size={26} radius={6} />
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>
              {headerOverride.name}
            </span>
          </>
        ) : conversation?.otherUser && (
          <>
            <div className="relative shrink-0">
              <Avatar src={conversation.otherUser.avatar} name={conversation.otherUser.displayName} size={26} />
              {peerOnline && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 rounded-full"
                  style={{ width: 8, height: 8, background: 'var(--dp-status-online)', border: '1.5px solid var(--dp-bg-panel)' }}
                />
              )}
            </div>
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>
              {conversation.otherUser.displayName}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
        {showLoadOlder && (
          <button
            onClick={loadOlder}
            disabled={loadingOlder}
            className="text-xs self-center mb-1"
            style={{ background: 'none', border: 'none', color: 'var(--dp-text-secondary)', cursor: 'pointer' }}
          >
            {loadingOlder ? 'Загружаем…' : 'Показать раньше'}
          </button>
        )}
        {historyError && <div className="dp-error">{historyError}</div>}

        {allMessages.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.senderId === myId} />
        ))}
        {allMessages.length === 0 && !loadingLatest && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Сообщений пока нет</div>
        )}
      </div>

      <div className="flex gap-2 pt-2 mt-2" style={{ borderTop: '1px solid var(--dp-border)' }}>
        <input
          type="text"
          className="dp-input text-xs flex-1"
          placeholder="Написать сообщение…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend()
          }}
        />
        <button onClick={handleSend} disabled={sending || !draft.trim()} className="dp-btn-primary text-xs shrink-0">
          Отправить
        </button>
      </div>
      {sendError && <div className="dp-error mt-1">{sendError}</div>}
    </div>
  )
}

function MessageBubble({ message, isMine }: { message: MessageEntry; isMine: boolean }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className="px-3 py-1.5 text-xs"
        style={{
          maxWidth: '75%',
          background: isMine ? 'var(--dp-accent)' : 'var(--dp-bg-card)',
          color: isMine ? '#05141f' : 'var(--dp-text-primary)',
          border: isMine ? 'none' : '1px solid var(--dp-border)',
          borderRadius: 10,
          wordBreak: 'break-word',
        }}
      >
        {message.body}
      </div>
    </div>
  )
}

import { useGetConversationsQuery } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { Avatar } from '../../shared/Avatar'
import type { ConversationEntry } from '../../../types/chat'

export function ConversationList({ onOpen }: { onOpen: (conversationId: string) => void }) {
  const { data, isFetching, error } = useGetConversationsQuery()

  const conversations = data?.conversations ?? []

  return (
    <div className="flex flex-col gap-2">
      {error && <div className="dp-error">{extractApiError(error, 'Не удалось загрузить чаты')}</div>}

      {conversations.map((conv) => (
        <ConversationRow key={conv.id} conv={conv} onOpen={() => onOpen(conv.id)} />
      ))}

      {conversations.length === 0 && !isFetching && !error && (
        <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>
          Пока нет ни одного чата — напишите другу со вкладки «Друзья»
        </div>
      )}
    </div>
  )
}

function ConversationRow({ conv, onOpen }: { conv: ConversationEntry; onOpen: () => void }) {
  const other = conv.otherUser
  if (!other) return null

  return (
    <button
      onClick={onOpen}
      className="p-2 flex items-center gap-3 text-left"
      style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6, cursor: 'pointer' }}
    >
      <div className="relative shrink-0">
        <Avatar src={other.avatar} name={other.displayName} size={36} background="var(--dp-bg-panel)" />
        {conv.otherUserOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{ width: 9, height: 9, background: 'var(--dp-status-online)', border: '1.5px solid var(--dp-bg-card)' }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{other.displayName}</span>
          {conv.unreadCount > 0 && (
            <span
              className="shrink-0 text-[10px] font-bold rounded-full flex items-center justify-center"
              style={{ minWidth: 16, height: 16, padding: '0 3px', background: 'var(--dp-red)', color: '#fff' }}
            >
              {conv.unreadCount}
            </span>
          )}
        </div>
        <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>
          {conv.lastMessage ? conv.lastMessage.body : 'Нет сообщений'}
        </div>
      </div>
    </button>
  )
}

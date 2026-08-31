/*
  ChatsWidget — лёгкое превью (замена ComingSoon-заглушки 'fit-chats' в
  panelRegistry.tsx, тот же id). Короткий список последних переписок +
  переход в полный SocialHub, как и FriendsWidget.
*/

import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useAppDispatch } from '../../../hooks/redux'
import { openConversation, setSocialHubOpen } from '../../../store/slices/uiSlice'
import { useGetConversationsQuery } from '../../../store/api/backendApi'
import { PanelHeader } from '../../shared/PanelHeader'
import { EmptyCard } from '../../shared/Card'
import { Avatar } from '../../shared/Avatar'

const PREVIEW_COUNT = 5

export function ChatsWidget() {
  const dispatch = useAppDispatch()
  const { data } = useGetConversationsQuery()

  const conversations = data?.conversations ?? []
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  function openList() {
    dispatch(setSocialHubOpen(true))
  }

  return (
    <motion.div className="dp-panel overflow-hidden" variants={staggerItemVariants}>
      <PanelHeader
        title="Чаты"
        right={
          <button onClick={openList} className="text-xs" style={{ background: 'none', border: 'none', color: 'var(--dp-accent)', cursor: 'pointer' }}>
            Все →
          </button>
        }
      />

      {conversations.length === 0 ? (
        <EmptyCard message="Пока нет ни одного чата" />
      ) : (
        <div className="flex flex-col">
          {conversations.slice(0, PREVIEW_COUNT).map((conv) => {
            if (!conv.otherUser) return null
            return (
              <button
                key={conv.id}
                onClick={() => dispatch(openConversation(conv.id))}
                className="flex items-center gap-2.5 px-3 py-2 text-left w-full"
                style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--dp-border)', cursor: 'pointer' }}
              >
                <Avatar src={conv.otherUser.avatar} name={conv.otherUser.displayName} size={28} />
                <span className="text-xs truncate flex-1" style={{ color: 'var(--dp-text-primary)' }}>{conv.otherUser.displayName}</span>
                {conv.unreadCount > 0 && (
                  <span
                    className="shrink-0 text-[10px] font-bold rounded-full flex items-center justify-center"
                    style={{ minWidth: 16, height: 16, padding: '0 3px', background: 'var(--dp-red)', color: '#fff' }}
                  >
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {totalUnread > 0 && (
        <div className="px-3 py-1.5 text-[10px]" style={{ color: 'var(--dp-text-muted)', borderTop: '1px solid var(--dp-border)' }}>
          Непрочитанных: {totalUnread}
        </div>
      )}
    </motion.div>
  )
}

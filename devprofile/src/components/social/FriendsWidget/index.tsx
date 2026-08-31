/*
  FriendsWidget — лёгкое превью для панели (замена ComingSoon-заглушки
  'dev-friends' в panelRegistry.tsx, тот же id). Короткий список + переход
  в полный SocialHub, а не отдельная реализация списка друзей.
*/

import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useAppDispatch } from '../../../hooks/redux'
import { setSocialHubOpen } from '../../../store/slices/uiSlice'
import { useGetFriendsQuery, useGetFriendRequestsQuery } from '../../../store/api/backendApi'
import { PanelHeader } from '../../shared/PanelHeader'
import { EmptyCard } from '../../shared/Card'
import { Avatar } from '../../shared/Avatar'

const PREVIEW_COUNT = 5

export function FriendsWidget() {
  const dispatch = useAppDispatch()
  const { data } = useGetFriendsQuery()
  const { data: incoming } = useGetFriendRequestsQuery({ direction: 'incoming' })

  const friends = data?.friends ?? []
  const pendingCount = incoming?.requests.length ?? 0

  function openHub() {
    dispatch(setSocialHubOpen(true))
  }

  return (
    <motion.div className="dp-panel overflow-hidden" variants={staggerItemVariants}>
      <PanelHeader
        title="Друзья"
        right={
          <button onClick={openHub} className="text-xs" style={{ background: 'none', border: 'none', color: 'var(--dp-accent)', cursor: 'pointer' }}>
            Все →
          </button>
        }
      />

      {pendingCount > 0 && (
        <button
          onClick={openHub}
          className="w-full text-left px-3 py-2 text-xs"
          style={{ background: 'var(--dp-bg-card-hover)', border: 'none', borderBottom: '1px solid var(--dp-border)', color: 'var(--dp-accent-bright)', cursor: 'pointer' }}
        >
          {pendingCount === 1 ? '1 новая заявка в друзья' : `${pendingCount} новых заявок в друзья`}
        </button>
      )}

      {friends.length === 0 ? (
        <EmptyCard message="Пока нет друзей" />
      ) : (
        <div className="flex flex-col">
          {friends.slice(0, PREVIEW_COUNT).map((entry) => (
            <div key={entry.friendshipId} className="flex items-center gap-2.5 px-3 py-2" style={{ borderBottom: '1px solid var(--dp-border)' }}>
              <Avatar src={entry.user.avatar} name={entry.user.displayName} size={28} />
              <span className="text-xs truncate" style={{ color: 'var(--dp-text-primary)' }}>{entry.user.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

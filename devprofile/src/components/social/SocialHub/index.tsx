/*
  SocialHub — тот же bottom-sheet каркас, что AdminPanel/SettingsPanel
  (slideUpVariants, useModalHistoryClose, оверлей). Вкладки: Чаты/Друзья/
  Заявки/Группы/Чёрный список. Полный экран конкретной группы — отдельный
  оверлей GroupDetail (см. openGroup в uiSlice), не вкладка здесь.
*/

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setSocialHubOpen } from '../../../store/slices/uiSlice'
import { useModalHistoryClose } from '../../../hooks/useModalHistoryClose'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { ChatsTab } from './ChatsTab'
import { FriendsTab } from './FriendsTab'
import { RequestsTab } from './RequestsTab'
import { GroupsTab } from './GroupsTab'
import { BlocklistTab } from './BlocklistTab'

type Tab = 'chats' | 'friends' | 'requests' | 'groups' | 'blocklist'

export function SocialHub() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.ui.isSocialHubOpen)
  const user = useAppSelector((state) => state.auth.user)
  const activeConversationId = useAppSelector((state) => state.ui.activeConversationId)
  const [tab, setTab] = useState<Tab>(activeConversationId ? 'chats' : 'friends')

  /*
    Кнопка «Написать» снаружи (FriendsTab, лидерборд) может сработать, пока
    хаб уже открыт на другой вкладке — тогда просто смены activeConversationId
    в сторе недостаточно, tab тоже готового мгновенно не переключится сам
    (useState-инициализатор срабатывает только при монтировании). Правим tab
    прямо во время рендера при смене id — тот самый случай, для которого React
    рекомендует именно это, а не useEffect+setState.
  */
  const [lastSeenConversationId, setLastSeenConversationId] = useState(activeConversationId)
  if (activeConversationId !== lastSeenConversationId) {
    setLastSeenConversationId(activeConversationId)
    if (activeConversationId) setTab('chats')
  }

  const onClose = useCallback(() => dispatch(setSocialHubOpen(false)), [dispatch])
  const close = useModalHistoryClose(isOpen, onClose, 'social-hub')

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
          />

          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              background: 'var(--dp-bg-panel)',
              borderTop: '1px solid var(--dp-border-accent)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
              maxHeight: '85vh',
              borderRadius: '12px 12px 0 0',
            }}
            variants={slideUpVariants}
            initial="hidden" animate="visible" exit="exit"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--dp-border-light)' }} />
            </div>

            <div
              className="flex items-center justify-between px-5 py-3 sticky top-0"
              style={{ background: 'var(--dp-bg-panel)', borderBottom: '1px solid var(--dp-border)' }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--dp-text-white)' }}>
                💬 Сообщения
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{
                  background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)',
                  color: 'var(--dp-text-secondary)', cursor: 'pointer', fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 px-5 pt-3">
              <TabButton active={tab === 'chats'} onClick={() => setTab('chats')}>Чаты</TabButton>
              <TabButton active={tab === 'friends'} onClick={() => setTab('friends')}>Друзья</TabButton>
              <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Заявки</TabButton>
              <TabButton active={tab === 'groups'} onClick={() => setTab('groups')}>Группы</TabButton>
              <TabButton active={tab === 'blocklist'} onClick={() => setTab('blocklist')}>Чёрный список</TabButton>
            </div>

            <div className="p-5">
              {tab === 'chats' && <ChatsTab />}
              {tab === 'friends' && <FriendsTab />}
              {tab === 'requests' && <RequestsTab />}
              {tab === 'groups' && <GroupsTab />}
              {tab === 'blocklist' && <BlocklistTab />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-3 py-1.5 rounded-t"
      style={{
        background: active ? 'var(--dp-bg-card)' : 'none',
        border: '1px solid var(--dp-border)',
        borderBottom: active ? '1px solid var(--dp-bg-card)' : '1px solid var(--dp-border)',
        color: active ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

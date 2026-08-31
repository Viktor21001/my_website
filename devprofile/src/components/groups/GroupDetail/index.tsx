/*
  GroupDetail — отдельный оверлей (тот же bottom-sheet каркас, что
  AdminPanel/SocialHub), не вкладка хаба — внутри ещё вложенные под-вкладки
  Стена/Участники/Чат. Открывается через activeGroupId в uiSlice (GroupsTab,
  GroupsWidget), закрывается сам по себе — не возвращает в SocialHub.
*/

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setActiveGroupId } from '../../../store/slices/uiSlice'
import { useModalHistoryClose } from '../../../hooks/useModalHistoryClose'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { useGetGroupQuery, useJoinGroupMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { Avatar } from '../../shared/Avatar'
import { ChatThread } from '../../social/SocialHub/ChatThread'
import { GroupWall } from '../GroupWall'
import { GroupMembers } from '../GroupMembers'

type Tab = 'wall' | 'members' | 'chat'

export function GroupDetail() {
  const dispatch = useAppDispatch()
  const groupId = useAppSelector((state) => state.ui.activeGroupId)
  const isOpen = groupId !== null
  const [tab, setTab] = useState<Tab>('wall')

  const onClose = useCallback(() => dispatch(setActiveGroupId(null)), [dispatch])
  const close = useModalHistoryClose(isOpen, onClose, 'group-detail')

  const { data, isFetching, error } = useGetGroupQuery(groupId ?? '', { skip: !groupId })
  const [joinGroup, { isLoading: joining }] = useJoinGroupMutation()
  const [joinError, setJoinError] = useState<string | null>(null)

  const group = data?.group
  const isMember = group?.myStatus === 'MEMBER'
  const canModerate = group?.myRole === 'OWNER' || group?.myRole === 'MODERATOR'

  async function handleJoin() {
    if (!groupId) return
    setJoinError(null)
    try {
      await joinGroup(groupId).unwrap()
    } catch (err) {
      setJoinError(extractApiError(err, 'Не удалось вступить в группу'))
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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

            {isFetching && !group && (
              <div className="p-5 text-xs text-center" style={{ color: 'var(--dp-text-muted)' }}>Загружаем…</div>
            )}
            {error && (
              <div className="p-5 dp-error">{extractApiError(error, 'Не удалось загрузить группу')}</div>
            )}

            {group && (
              <>
                <div
                  className="flex items-center gap-3 px-5 py-3 sticky top-0"
                  style={{ background: 'var(--dp-bg-panel)', borderBottom: '1px solid var(--dp-border)' }}
                >
                  <Avatar src={group.avatar} name={group.name} size={36} radius={8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>
                      {group.name} {group.privacy === 'PRIVATE' && '🔒'}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>
                      #{group.slug} · {group.memberCount} {group.memberCount === 1 ? 'участник' : 'участников'}
                    </div>
                  </div>
                  <button
                    onClick={close}
                    className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
                    style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', color: 'var(--dp-text-secondary)', cursor: 'pointer', fontSize: 16 }}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2 px-5 pt-3">
                  <TabButton active={tab === 'wall'} onClick={() => setTab('wall')}>Стена</TabButton>
                  <TabButton active={tab === 'members'} onClick={() => setTab('members')}>Участники</TabButton>
                  <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>Чат</TabButton>
                </div>

                <div className="p-5">
                  {group.description && tab === 'wall' && (
                    <div className="text-xs mb-3" style={{ color: 'var(--dp-text-secondary)' }}>{group.description}</div>
                  )}

                  {tab === 'members' && (
                    <GroupMembers groupId={groupId!} myRole={group.myRole} isPrivate={group.privacy === 'PRIVATE'} onLeft={close} />
                  )}

                  {tab !== 'members' && !isMember && (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <span className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Доступно только участникам группы</span>
                      {group.myStatus === 'PENDING' ? (
                        <span className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>Заявка на вступление уже отправлена</span>
                      ) : (
                        <button onClick={handleJoin} disabled={joining} className="dp-btn-primary text-xs">
                          {group.privacy === 'PRIVATE' ? 'Подать заявку' : 'Вступить'}
                        </button>
                      )}
                      {joinError && <div className="dp-error">{joinError}</div>}
                    </div>
                  )}

                  {tab === 'wall' && isMember && <GroupWall groupId={groupId!} canModerate={canModerate} />}
                  {tab === 'chat' && isMember && group.conversationId && (
                    <ChatThread
                      conversationId={group.conversationId}
                      onBack={() => setTab('wall')}
                      headerOverride={{ name: group.name, avatar: group.avatar }}
                    />
                  )}
                </div>
              </>
            )}
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

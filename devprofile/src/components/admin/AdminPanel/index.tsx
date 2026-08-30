/*
  AdminPanel — тот же bottom-sheet каркас, что SettingsPanel (slideUpVariants,
  useModalHistoryClose, оверлей). Две вкладки: «Пользователи» (видна ADMIN
  и CREATOR) и «Журнал действий» (видна только CREATOR — вся активность
  всех админ-панелей разом).

  Все проверки прав здесь — только UI-подсказка (какие кнопки показать).
  Реальная защита — на сервере (см. Сервер/src/routes/admin.ts), который
  перепроверяет роль заново на каждый запрос, а не доверяет этому клиенту.
*/

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setAdminPanelOpen } from '../../../store/slices/uiSlice'
import { useModalHistoryClose } from '../../../hooks/useModalHistoryClose'
import {
  useLazyGetAdminUsersQuery, useUnbanUserMutation, useResetUserPasswordMutation,
  useDeleteAdminUserMutation, usePromoteUserMutation, useDemoteUserMutation,
  useLazyGetAuditLogQuery,
} from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { BanDialog } from '../BanDialog'
import type { AuthUser } from '../../../types/auth'
import type { AdminUserRow, AuditLogEntry, AdminAction } from '../../../types/admin'

type Tab = 'users' | 'audit'

export function AdminPanel() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.ui.isAdminPanelOpen)
  const user = useAppSelector((state) => state.auth.user)
  const [tab, setTab] = useState<Tab>('users')

  const onClose = useCallback(() => dispatch(setAdminPanelOpen(false)), [dispatch])
  const close = useModalHistoryClose(isOpen, onClose, 'admin-panel')

  const isCreator = user?.role === 'CREATOR'

  return (
    <AnimatePresence>
      {isOpen && user && (user.role === 'ADMIN' || user.role === 'CREATOR') && (
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
                🛡 Админ-панель
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
              <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Пользователи</TabButton>
              {isCreator && (
                <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>Журнал действий</TabButton>
              )}
            </div>

            <div className="p-5">
              {tab === 'users' ? <UsersTab currentUser={user} /> : <AuditLogTab />}
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

function ROLE_LABEL(role: AdminUserRow['role']) {
  if (role === 'CREATOR') return 'Создатель'
  if (role === 'ADMIN') return 'Админ'
  return 'Пользователь'
}

function RoleBadge({ role }: { role: AdminUserRow['role'] }) {
  const color = role === 'CREATOR' ? 'var(--dp-orange)' : role === 'ADMIN' ? 'var(--dp-accent)' : 'var(--dp-text-muted)'
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
      style={{ border: `1px solid ${color}`, color, whiteSpace: 'nowrap' }}
    >
      {ROLE_LABEL(role)}
    </span>
  )
}

function formatBanStatus(row: AdminUserRow): { text: string; color: string } | null {
  if (!row.bannedAt) return null
  if (!row.bannedUntil) return { text: 'забанен навсегда', color: 'var(--dp-red)' }
  const until = new Date(row.bannedUntil)
  if (until.getTime() <= Date.now()) return null // истёк — как «не забанен», сервер тоже так считает
  return { text: `забанен до ${until.toLocaleDateString('ru-RU')}`, color: 'var(--dp-orange)' }
}

function UsersTab({ currentUser }: { currentUser: AuthUser }) {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchUsers, { isFetching }] = useLazyGetAdminUsersQuery()

  // Поиск и переключение вкладки — не «зеркалирование» пропа в state,
  // а настоящий побочный эффект (поход на сервер); сам setRows делается
  // не синхронно в теле эффекта, а в .then() уже настоящего запроса —
  // иначе линтер (react-hooks/set-state-in-effect) справедливо ругается
  // на паттерн «эффект просто копирует пришедшие данные в state»
  useEffect(() => {
    let cancelled = false
    fetchUsers({ q: q || undefined })
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.users)
        setNextCursor(result.nextCursor)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить список пользователей'))
      })
    return () => {
      cancelled = true
    }
  }, [q, fetchUsers])

  function loadMore() {
    if (!nextCursor) return
    setLoadError(null)
    fetchUsers({ q: q || undefined, cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.users])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить список пользователей')))
  }

  // После бана/разбана/выдачи-отзыва прав/удаления строка сама по себе не
  // знает новое состояние — invalidatesTags на мутациях (backendApi.ts)
  // тут не помогает: rows живёт в локальном state, наполненном один раз
  // через useLazyGetAdminUsersQuery, а не через реактивный useQuery,
  // подписанный на тег. Перезапрашиваем текущую первую страницу заново.
  function refresh() {
    fetchUsers({ q: q || undefined })
      .unwrap()
      .then((result) => {
        setRows(result.users)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось обновить список пользователей')))
  }

  const isCreator = currentUser.role === 'CREATOR'

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text" className="dp-input text-xs" placeholder="Поиск по имени, логину или почте"
        value={q} onChange={(e) => setQ(e.target.value)}
      />

      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <UserRow key={row.id} row={row} currentUser={currentUser} isCreator={isCreator} onChanged={refresh} />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Никого не найдено</div>
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

function UserRow({
  row, currentUser, isCreator, onChanged,
}: {
  row: AdminUserRow
  currentUser: AuthUser
  isCreator: boolean
  onChanged: () => void
}) {
  const [banOpen, setBanOpen] = useState(false)
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [unbanUser, { isLoading: unbanning }] = useUnbanUserMutation()
  const [resetPassword, { isLoading: resetting }] = useResetUserPasswordMutation()
  const [deleteUser, { isLoading: deleting }] = useDeleteAdminUserMutation()
  const [promoteUser, { isLoading: promoting }] = usePromoteUserMutation()
  const [demoteUser, { isLoading: demoting }] = useDemoteUserMutation()

  const isSelf = row.id === currentUser.id
  // Обычный ADMIN не может действовать на другого ADMIN/CREATOR — те же
  // правила, что сервер применяет в assertCanModerate (routes/admin.ts),
  // здесь только чтобы не показывать заведомо запрещённые кнопки
  const canModerate = !isSelf && row.role !== 'CREATOR' && (row.role !== 'ADMIN' || isCreator)

  const banStatus = formatBanStatus(row)

  function resetTransientState() {
    setActionError(null)
  }

  async function handleUnban() {
    resetTransientState()
    try {
      await unbanUser(row.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось разбанить'))
    }
  }

  async function handleResetPassword() {
    resetTransientState()
    try {
      const result = await resetPassword(row.id).unwrap()
      setRevealedPassword(result.password)
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось сбросить пароль'))
    }
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    resetTransientState()
    deleteUser(row.id)
      .unwrap()
      .then(onChanged)
      .catch((err) => setActionError(extractApiError(err, 'Не удалось удалить пользователя')))
    setConfirmDelete(false)
  }

  async function handlePromote() {
    resetTransientState()
    try {
      await promoteUser(row.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось выдать права администратора'))
    }
  }

  async function handleDemote() {
    resetTransientState()
    try {
      await demoteUser(row.id).unwrap()
      onChanged()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось забрать права администратора'))
    }
  }

  return (
    <div className="p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 overflow-hidden flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid var(--dp-border)', background: 'var(--dp-bg-panel)' }}
        >
          {row.avatar ? (
            <img src={row.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold" style={{ color: 'var(--dp-text-secondary)' }}>
              {row.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{row.displayName}</span>
            <span className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>@{row.username}</span>
            <RoleBadge role={row.role} />
            {banStatus && <span className="text-[10px]" style={{ color: banStatus.color }}>{banStatus.text}</span>}
          </div>
          <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>{row.email} · {row.id}</div>
        </div>
      </div>

      {canModerate && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {!row.bannedAt ? (
            <button onClick={() => setBanOpen((v) => !v)} className="dp-btn-ghost text-xs">Забанить</button>
          ) : (
            <button onClick={handleUnban} disabled={unbanning} className="dp-btn-ghost text-xs">Разбанить</button>
          )}
          <button onClick={handleResetPassword} disabled={resetting} className="dp-btn-ghost text-xs">Сбросить пароль</button>
          {isCreator && row.role === 'USER' && (
            <button onClick={handlePromote} disabled={promoting} className="dp-btn-ghost text-xs">Выдать права admin</button>
          )}
          {isCreator && row.role === 'ADMIN' && (
            <button onClick={handleDemote} disabled={demoting} className="dp-btn-ghost text-xs">Забрать права admin</button>
          )}
          <button
            onClick={handleDeleteClick} disabled={deleting} className="dp-btn-ghost text-xs"
            style={{ color: confirmDelete ? 'var(--dp-red)' : undefined, borderColor: confirmDelete ? 'var(--dp-red)' : undefined }}
          >
            {confirmDelete ? 'Точно удалить?' : 'Удалить'}
          </button>
        </div>
      )}

      {banOpen && (
        <BanDialog
          userId={row.id}
          onClose={() => setBanOpen(false)}
          onBanned={() => {
            setBanOpen(false)
            onChanged()
          }}
        />
      )}

      {revealedPassword && (
        <div className="flex items-center gap-2 mt-2 p-2 text-xs" style={{ background: 'var(--dp-bg-panel)', border: '1px solid var(--dp-accent)', borderRadius: 6 }}>
          <span style={{ color: 'var(--dp-text-muted)' }}>Новый пароль (сообщите пользователю лично, показывается один раз):</span>
          <code style={{ color: 'var(--dp-text-white)' }}>{revealedPassword}</code>
          <button onClick={() => setRevealedPassword(null)} className="ml-auto" style={{ background: 'none', border: 'none', color: 'var(--dp-text-muted)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {actionError && <div className="dp-error mt-2">{actionError}</div>}
    </div>
  )
}

const AUDIT_ACTION_LABEL: Record<AdminAction, string> = {
  BAN: 'забанил(а)',
  UNBAN: 'разбанил(а)',
  DELETE_USER: 'удалил(а)',
  RESET_PASSWORD: 'сбросил(а) пароль',
  PROMOTE_ADMIN: 'выдал(а) права admin',
  DEMOTE_ADMIN: 'забрал(а) права admin',
}

function formatAuditDetails(entry: AuditLogEntry): string | null {
  const d = entry.details
  if (!d) return null
  if (entry.action === 'BAN') {
    const days = d.days as number | null
    const reason = d.reason as string | undefined
    return `${days ? `на ${days} дн.` : 'навсегда'}${reason ? ` — ${reason}` : ''}`
  }
  return null
}

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchLog, { isFetching }] = useLazyGetAuditLogQuery()

  useEffect(() => {
    let cancelled = false
    fetchLog(undefined)
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setEntries(result.entries)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить журнал действий'))
      })
    return () => {
      cancelled = true
    }
  }, [fetchLog])

  function loadMore() {
    if (!nextCursor) return
    fetchLog({ cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setEntries((prev) => [...prev, ...result.entries])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить журнал действий')))
  }

  return (
    <div className="flex flex-col gap-2">
      {loadError && <div className="dp-error">{loadError}</div>}

      {entries.map((entry) => (
        <div key={entry.id} className="p-2 text-xs" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
          <span style={{ color: 'var(--dp-text-muted)' }}>{new Date(entry.createdAt).toLocaleString('ru-RU')}</span>
          {' — '}
          <span style={{ color: 'var(--dp-text-white)' }}>{entry.actorUsername}</span>
          {' '}
          {AUDIT_ACTION_LABEL[entry.action]}
          {' '}
          <span style={{ color: 'var(--dp-text-white)' }}>{entry.targetUsername ?? '(аккаунт удалён)'}</span>
          {formatAuditDetails(entry) && <span style={{ color: 'var(--dp-text-muted)' }}> ({formatAuditDetails(entry)})</span>}
        </div>
      ))}
      {entries.length === 0 && !isFetching && (
        <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Пока пусто</div>
      )}

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

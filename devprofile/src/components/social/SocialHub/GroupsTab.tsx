import { useEffect, useState } from 'react'
import { useLazyGetGroupsQuery, useJoinGroupMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppDispatch } from '../../../hooks/redux'
import { openGroup } from '../../../store/slices/uiSlice'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { Avatar } from '../../shared/Avatar'
import { CreateGroupDialog } from '../../groups/CreateGroupDialog'
import type { GroupSummary } from '../../../types/groups'

type Mode = 'mine' | 'browse'

export function GroupsTab() {
  const [mode, setMode] = useState<Mode>('mine')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [creating, setCreating] = useState(false)
  const [rows, setRows] = useState<GroupSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchGroups, { isFetching }] = useLazyGetGroupsQuery()

  useEffect(() => {
    let cancelled = false
    fetchGroups(mode === 'mine' ? { mine: true } : { q: debouncedQ || undefined })
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.groups)
        setNextCursor(result.nextCursor)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить группы'))
      })
    return () => {
      cancelled = true
    }
  }, [mode, debouncedQ, fetchGroups])

  function loadMore() {
    if (!nextCursor) return
    fetchGroups(mode === 'mine' ? { mine: true, cursor: nextCursor } : { q: debouncedQ || undefined, cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.groups])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить группы')))
  }

  function refresh() {
    fetchGroups(mode === 'mine' ? { mine: true } : { q: debouncedQ || undefined })
      .unwrap()
      .then((result) => {
        setRows(result.groups)
        setNextCursor(result.nextCursor)
      })
      .catch(() => {})
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <SubTabButton active={mode === 'mine'} onClick={() => setMode('mine')}>Мои группы</SubTabButton>
          <SubTabButton active={mode === 'browse'} onClick={() => setMode('browse')}>Обзор</SubTabButton>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="dp-btn-ghost text-xs">
          {creating ? 'Отмена' : '+ Создать'}
        </button>
      </div>

      {creating && <CreateGroupDialog onClose={() => setCreating(false)} />}

      {mode === 'browse' && (
        <input
          type="text" className="dp-input text-xs" placeholder="Поиск групп по названию"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      )}

      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((g) => (
          <GroupRow key={g.id} group={g} onChanged={refresh} />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>
            {mode === 'mine' ? 'Вы пока не состоите ни в одной группе' : 'Ничего не найдено'}
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

function GroupRow({ group, onChanged }: { group: GroupSummary; onChanged: () => void }) {
  const dispatch = useAppDispatch()
  const [joinGroup, { isLoading }] = useJoinGroupMutation()
  const [error, setError] = useState<string | null>(null)

  async function handleJoin(e: React.MouseEvent) {
    e.stopPropagation()
    setError(null)
    try {
      await joinGroup(group.id).unwrap()
      onChanged()
    } catch (err) {
      setError(extractApiError(err, 'Не удалось вступить в группу'))
    }
  }

  return (
    <div
      onClick={() => dispatch(openGroup(group.id))}
      className="p-2 flex items-center gap-3 text-left w-full"
      style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6, cursor: 'pointer' }}
    >
      <Avatar src={group.avatar} name={group.name} size={36} radius={8} background="var(--dp-bg-panel)" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{group.name}</span>
          {group.privacy === 'PRIVATE' && (
            <span className="text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>🔒</span>
          )}
        </div>
        <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>
          {group.memberCount} {group.memberCount === 1 ? 'участник' : 'участников'}
        </div>
        {error && <div className="text-[10px] mt-0.5" style={{ color: 'var(--dp-red)' }}>{error}</div>}
      </div>
      {group.myStatus === 'MEMBER' ? (
        <span className="shrink-0 text-[10px]" style={{ color: 'var(--dp-green)' }}>Участник</span>
      ) : group.myStatus === 'PENDING' ? (
        <span className="shrink-0 text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>Заявка отправлена</span>
      ) : (
        <button onClick={handleJoin} disabled={isLoading} className="dp-btn-ghost text-xs shrink-0">
          {group.privacy === 'PRIVATE' ? 'Подать заявку' : 'Вступить'}
        </button>
      )}
    </div>
  )
}

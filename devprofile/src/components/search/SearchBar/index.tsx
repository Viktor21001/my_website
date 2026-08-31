/*
  SearchBar — поиск по сайту (Люди + Группы), выпадающая панель под строкой
  ввода. Дебаунс + локальный state + Lazy-запрос — тот же паттерн, что уже
  принят для GroupsTab/FriendsTab, не реактивный кэш RTK Query (поиск —
  не «живые» данные, которые нужно точечно патчить сокетом).
*/

import { useEffect, useRef, useState } from 'react'
import { useLazyGetSearchQuery } from '../../../store/api/backendApi'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useAppDispatch } from '../../../hooks/redux'
import { openGroup } from '../../../store/slices/uiSlice'
import { extractApiError } from '../../../utils/apiError'
import { Avatar } from '../../shared/Avatar'
import { PersonActions } from '../../social/PersonActions'
import type { PublicUser } from '../../../types/social'
import type { GroupSummary } from '../../../types/groups'
import type { SearchResults } from '../../../types/search'

export function SearchBar() {
  const dispatch = useAppDispatch()
  const containerRef = useRef<HTMLDivElement>(null)

  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchSearch, { isFetching }] = useLazyGetSearchQuery()

  const trimmedQ = debouncedQ.trim()

  // Сброс результатов при уходе в пустой запрос — прямо в рендере при
  // сравнении с предыдущим значением, не синхронный setState в теле
  // эффекта (react-hooks/set-state-in-effect), тот же приём, что уже в
  // Avatar/SocialHub
  const [lastTrimmedQ, setLastTrimmedQ] = useState(trimmedQ)
  if (trimmedQ !== lastTrimmedQ) {
    setLastTrimmedQ(trimmedQ)
    if (!trimmedQ) {
      setResults(null)
      setLoadError(null)
    }
  }

  useEffect(() => {
    if (!trimmedQ) return
    let cancelled = false
    fetchSearch({ q: trimmedQ })
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setResults(result)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось выполнить поиск'))
      })
    return () => {
      cancelled = true
    }
  }, [trimmedQ, fetchSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleGroupClick(id: string) {
    dispatch(openGroup(id))
    setIsOpen(false)
  }

  const showDropdown = isOpen && q.trim().length > 0

  return (
    <div ref={containerRef} className="relative shrink-0" style={{ width: 180 }}>
      <input
        type="text"
        className="dp-input text-xs"
        placeholder="🔍 Поиск"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
      />

      {showDropdown && (
        <div
          className="absolute top-full right-0 mt-1 z-50 overflow-y-auto"
          style={{
            width: 340, maxHeight: 420,
            background: 'var(--dp-bg-panel)', border: '1px solid var(--dp-border-accent)',
            borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
        >
          {isFetching && !results && (
            <div className="p-3 text-xs text-center" style={{ color: 'var(--dp-text-muted)' }}>Ищем…</div>
          )}
          {loadError && <div className="p-3 dp-error">{loadError}</div>}

          {results && (
            <>
              <SectionLabel>Люди</SectionLabel>
              {results.users.length === 0 ? (
                <EmptyRow text="Никого не найдено" />
              ) : (
                results.users.map((u) => <UserResultRow key={u.id} user={u} />)
              )}

              <SectionLabel>Группы</SectionLabel>
              {results.groups.length === 0 ? (
                <EmptyRow text="Групп не найдено" />
              ) : (
                results.groups.map((g) => <GroupResultRow key={g.id} group={g} onClick={() => handleGroupClick(g.id)} />)
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase tracking-wider px-3 pt-2.5 pb-1.5"
      style={{ color: 'var(--dp-text-muted)', borderTop: '1px solid var(--dp-border)' }}
    >
      {children}
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-3 pb-2.5 text-xs" style={{ color: 'var(--dp-text-muted)' }}>{text}</div>
}

function UserResultRow({ user }: { user: PublicUser }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5">
      <Avatar src={user.avatar} name={user.displayName} size={28} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{user.displayName}</div>
        <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>@{user.username}</div>
      </div>
      <PersonActions userId={user.id} />
    </div>
  )
}

function GroupResultRow({ group, onClick }: { group: GroupSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left"
      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <Avatar src={group.avatar} name={group.name} size={28} radius={6} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>
          {group.name} {group.privacy === 'PRIVATE' && '🔒'}
        </div>
        <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>
          {group.memberCount} {group.memberCount === 1 ? 'участник' : 'участников'}
        </div>
      </div>
      {group.myStatus === 'MEMBER' && (
        <span className="shrink-0 text-[10px]" style={{ color: 'var(--dp-green)' }}>Участник</span>
      )}
    </button>
  )
}

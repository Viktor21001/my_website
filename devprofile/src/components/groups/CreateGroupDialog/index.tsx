/*
  CreateGroupDialog — маленькая форма создания группы, тот же паттерн, что
  BanDialog (инлайн-форма, не модалка). Создатель сразу становится OWNER —
  сервер делает это одной транзакцией (routes/groups.ts).
*/

import { useState } from 'react'
import { useCreateGroupMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppDispatch } from '../../../hooks/redux'
import { openGroup } from '../../../store/slices/uiSlice'
import type { GroupPrivacy } from '../../../types/groups'

interface CreateGroupDialogProps {
  onClose: () => void
}

export function CreateGroupDialog({ onClose }: CreateGroupDialogProps) {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<GroupPrivacy>('PUBLIC')
  const [createGroup, { isLoading, error }] = useCreateGroupMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const result = await createGroup({ name: name.trim(), description: description.trim() || undefined, privacy }).unwrap()
      dispatch(openGroup(result.group.id))
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-3"
      style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}
    >
      <input
        type="text" className="dp-input text-xs" required maxLength={80}
        value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Название группы"
      />
      <textarea
        className="dp-input text-xs" rows={2} maxLength={500}
        value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание (необязательно)"
      />
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
          <input type="radio" checked={privacy === 'PUBLIC'} onChange={() => setPrivacy('PUBLIC')} />
          Публичная — вступление мгновенное
        </label>
        <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
          <input type="radio" checked={privacy === 'PRIVATE'} onChange={() => setPrivacy('PRIVATE')} />
          По заявке
        </label>
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось создать группу')}</div>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="dp-btn-ghost text-xs">Отмена</button>
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Создаём…' : 'Создать'}
        </button>
      </div>
    </form>
  )
}

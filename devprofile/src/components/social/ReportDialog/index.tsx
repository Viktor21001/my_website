/*
  ReportDialog — тот же паттерн, что BanDialog: инлайн-форма под строкой
  пользователя, не модалка.
*/

import { useState } from 'react'
import { useFileReportMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import type { ReportCategory } from '../../../types/reports'

const CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: 'HARASSMENT', label: 'Оскорбления / преследование' },
  { value: 'SPAM', label: 'Спам' },
  { value: 'SCAM', label: 'Мошенничество' },
  { value: 'INAPPROPRIATE_PROFILE', label: 'Неприемлемый профиль' },
  { value: 'OTHER', label: 'Другое' },
]

interface ReportDialogProps {
  reportedUserId: string
  onClose: () => void
  onSent: () => void
}

export function ReportDialog({ reportedUserId, onClose, onSent }: ReportDialogProps) {
  const [category, setCategory] = useState<ReportCategory>('HARASSMENT')
  const [description, setDescription] = useState('')
  const [fileReport, { isLoading, error }] = useFileReportMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    try {
      await fileReport({ reportedUserId, category, description: description.trim() }).unwrap()
      onSent()
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-3 mt-2"
      style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}
    >
      <select
        className="dp-input text-xs"
        value={category}
        onChange={(e) => setCategory(e.target.value as ReportCategory)}
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <textarea
        className="dp-input text-xs" rows={2} required maxLength={2000}
        value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="В чём заключается нарушение (обязательно)"
      />

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось отправить жалобу')}</div>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="dp-btn-ghost text-xs">Отмена</button>
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Отправляем…' : 'Пожаловаться'}
        </button>
      </div>
    </form>
  )
}

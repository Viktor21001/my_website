import { useState } from 'react'
import { useRegisterMutation } from '../../../store/api/backendApi'
import { useAppDispatch } from '../../../hooks/redux'
import { setCredentials } from '../../../store/slices/authSlice'
import { AGE_GROUPS, AGE_GROUP_LABELS } from '../../../config/fitnessConstants'
import { extractApiError } from '../../../utils/apiError'
import type { AgeGroup } from '../../../types/fitness'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('26-30')
  const [register, { isLoading, error }] = useRegisterMutation()
  const dispatch = useAppDispatch()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await register({ email, username, password, displayName, ageGroup }).unwrap()
      dispatch(setCredentials(result))
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Имя (отображается в профиле)"
        className="dp-input"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        autoFocus
      />
      <input
        type="text"
        placeholder="Логин"
        className="dp-input"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email"
        className="dp-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Пароль (не короче 6 символов)"
        className="dp-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required
      />
      <select
        className="dp-input"
        value={ageGroup}
        onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
      >
        {AGE_GROUPS.map((g) => (
          <option key={g} value={g}>{AGE_GROUP_LABELS[g]} лет</option>
        ))}
      </select>

      {error && (
        <div className="dp-error">
          {extractApiError(error, 'Не удалось зарегистрироваться — проверьте данные')}
        </div>
      )}

      <button type="submit" className="dp-btn-primary" disabled={isLoading}>
        {isLoading ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
      </button>
    </form>
  )
}

import { useState } from 'react'
import { useLoginMutation } from '../../../store/api/backendApi'
import { useAppDispatch } from '../../../hooks/redux'
import { setCredentials } from '../../../store/slices/authSlice'
import { extractApiError } from '../../../utils/apiError'

export function LoginForm() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [login, { isLoading, error }] = useLoginMutation()
  const dispatch = useAppDispatch()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const result = await login({ emailOrUsername, password }).unwrap()
      dispatch(setCredentials(result))
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Email или логин"
        className="dp-input"
        value={emailOrUsername}
        onChange={(e) => setEmailOrUsername(e.target.value)}
        required
        autoFocus
      />
      <input
        type="password"
        placeholder="Пароль"
        className="dp-input"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <div className="dp-error">{extractApiError(error, 'Неверный логин или пароль')}</div>
      )}

      <button type="submit" className="dp-btn-primary" disabled={isLoading}>
        {isLoading ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}

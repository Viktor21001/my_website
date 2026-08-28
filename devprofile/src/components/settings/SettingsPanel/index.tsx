/*
  SettingsPanel — единая панель настроек аккаунта. Заменяет старый
  BackgroundEditor (тот же shell/анимация — slideUpVariants, overlay,
  bottom-sheet) и добавляет то, что не спрашивается при регистрации:
  аватар, био, локацию, GitHub/Steam, фон, смену пароля.

  Каждая секция сохраняется отдельно (своя кнопка «Сохранить») —
  так меньше риска затереть одно поле пока правишь другое.
*/

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setSettingsOpen } from '../../../store/slices/uiSlice'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { useChangePasswordMutation } from '../../../store/api/backendApi'
import { BACKGROUND_PRESETS } from '../../../config/constants'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { extractApiError } from '../../../utils/apiError'
import type { AuthUser } from '../../../types/auth'
import { DEFAULT_BACKGROUND, type BackgroundConfig } from '../../../types/profile'

// Метка на history-записи, которую сами же и запушили при открытии панели
const HISTORY_MARKER = 'settings-panel'

export function SettingsPanel() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.ui.isSettingsOpen)
  const user = useAppSelector((state) => state.auth.user)

  /*
    Без этого браузерная кнопка "назад" при открытой панели уводит
    со всего сайта (SPA без роутера — URL не менялся, значит "назад"
    улетает в историю ДО сайта), а не просто закрывает настройки.
    Пушим отдельную запись при открытии — "назад" вернётся на неё же
    (popstate) и просто закроет панель, оставаясь на странице.
  */
  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ modal: HISTORY_MARKER }, '')

    function handlePopState() {
      dispatch(setSettingsOpen(false))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isOpen, dispatch])

  function close() {
    // Если стоим на запушенной записи — уходим "назад" с неё, а не вперёд
    // новой; popstate-обработчик выше сам закроет панель.
    if (window.history.state?.modal === HISTORY_MARKER) {
      window.history.back()
    } else {
      dispatch(setSettingsOpen(false))
    }
  }

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--dp-border-light)' }} />
            </div>

            <div
              className="flex items-center justify-between px-5 py-3 sticky top-0"
              style={{ background: 'var(--dp-bg-panel)', borderBottom: '1px solid var(--dp-border)' }}
            >
              <div className="text-sm font-semibold" style={{ color: 'var(--dp-text-white)' }}>
                Настройки профиля
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{
                  background: 'var(--dp-bg-card)',
                  border: '1px solid var(--dp-border)',
                  color: 'var(--dp-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">
              <AvatarSection user={user} />
              <PersonalInfoSection user={user} />
              <ConnectedAccountsSection user={user} />
              <BackgroundSection user={user} />
              <PasswordSection />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="dp-section-title"
      style={{ margin: '0 -5px 10px', background: 'none', border: 'none', padding: '0 0 6px', borderBottom: '1px solid var(--dp-border)' }}
    >
      {children}
    </div>
  )
}

function AvatarSection({ user }: { user: AuthUser }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(user.avatar)
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 4 * 1024 * 1024) {
      alert('Файл слишком большой — до 4МБ')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaved(false)
    try {
      await updateProfile({ avatar: preview })
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <section>
      <SectionTitle>Аватар</SectionTitle>
      <div className="flex items-center gap-4">
        <div
          className="shrink-0 overflow-hidden flex items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: 6, border: '1px solid var(--dp-border)', background: 'var(--dp-bg-card)' }}
        >
          {preview ? (
            <img src={preview} alt="Аватар" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold" style={{ color: 'var(--dp-text-secondary)' }}>
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="dp-btn-ghost text-xs">
              📁 Выбрать файл
            </button>
            <button onClick={save} className="dp-btn-primary text-xs" disabled={isLoading}>
              {isLoading ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
          {saved && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Сохранено</span>}
          {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить аватар')}</div>}
        </div>
      </div>
    </section>
  )
}

function PersonalInfoSection({ user }: { user: AuthUser }) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio ?? '')
  const [location, setLocation] = useState(user.location ?? '')
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    try {
      await updateProfile({ displayName, bio, location })
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <section>
      <SectionTitle>Личная информация</SectionTitle>
      <form onSubmit={save} className="flex flex-col gap-2">
        <input
          type="text" className="dp-input" placeholder="Имя"
          value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
        />
        <input
          type="text" className="dp-input" placeholder="Локация"
          value={location} onChange={(e) => setLocation(e.target.value)}
        />
        <textarea
          className="dp-input" placeholder="О себе" rows={2}
          value={bio} onChange={(e) => setBio(e.target.value)}
        />
        {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить')}</div>}
        <div className="flex items-center gap-2">
          <button type="submit" className="dp-btn-primary text-xs self-start" disabled={isLoading}>
            {isLoading ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {saved && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Сохранено</span>}
        </div>
      </form>
    </section>
  )
}

function ConnectedAccountsSection({ user }: { user: AuthUser }) {
  const [githubUsername, setGithubUsername] = useState(user.githubUsername ?? '')
  const [steamId, setSteamId] = useState(user.steamId ?? '')
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    try {
      await updateProfile({ githubUsername, steamId })
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <section>
      <SectionTitle>Связанные аккаунты</SectionTitle>
      <form onSubmit={save} className="flex flex-col gap-2">
        <input
          type="text" className="dp-input" placeholder="GitHub username"
          value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)}
        />
        <input
          type="text" className="dp-input" placeholder="Steam ID (64-битный)"
          value={steamId} onChange={(e) => setSteamId(e.target.value)}
        />
        {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить')}</div>}
        <div className="flex items-center gap-2">
          <button type="submit" className="dp-btn-primary text-xs self-start" disabled={isLoading}>
            {isLoading ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {saved && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Сохранено</span>}
        </div>
      </form>
    </section>
  )
}

function BackgroundSection({ user }: { user: AuthUser }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [background, setBackgroundState] = useState<BackgroundConfig>(user.background ?? DEFAULT_BACKGROUND)
  const [updateProfile, { isLoading, error }] = useUpdateProfile()

  function applyAndSave(next: BackgroundConfig) {
    setBackgroundState(next)
    updateProfile({ background: next }).catch(() => {})
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 4 * 1024 * 1024) {
      alert('Файл слишком большой — до 4МБ')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      applyAndSave({ ...background, type: 'image', url: ev.target?.result as string })
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>Фон профиля — сохраняется автоматически</SectionTitle>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить фон')}</div>}

      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--dp-text-secondary)' }}>Пресеты</div>
        <div className="flex flex-wrap gap-2">
          {BACKGROUND_PRESETS.map((p) => {
            const active = background.url === p.url && background.type === 'preset'
            return (
              <button
                key={p.id}
                onClick={() => applyAndSave({ ...background, type: 'preset', url: p.url })}
                className="px-4 py-2 rounded text-xs font-medium"
                style={{
                  background: active ? 'var(--dp-accent)' : 'var(--dp-bg-card)',
                  color: active ? '#05141f' : 'var(--dp-text-secondary)',
                  border: `1px solid ${active ? 'var(--dp-accent)' : 'var(--dp-border)'}`,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--dp-text-secondary)' }}>Своё изображение</div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()} className="dp-btn-ghost text-xs" disabled={isLoading}>
            📁 Выбрать файл
          </button>
          {background.type === 'image' && (
            <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Загружено</span>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--dp-text-secondary)' }}>
          Размытие — <span className="font-mono" style={{ color: 'var(--dp-text-code)' }}>{background.blur}px</span>
        </div>
        <input
          type="range" min={0} max={20} step={1} className="dp-range"
          value={background.blur}
          onChange={(e) => setBackgroundState({ ...background, blur: +e.target.value })}
          onMouseUp={(e) => applyAndSave({ ...background, blur: +e.currentTarget.value })}
        />
      </div>

      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--dp-text-secondary)' }}>
          Затемнение — <span className="font-mono" style={{ color: 'var(--dp-text-code)' }}>{Math.round(background.opacity * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05} className="dp-range"
          value={background.opacity}
          onChange={(e) => setBackgroundState({ ...background, opacity: +e.target.value })}
          onMouseUp={(e) => applyAndSave({ ...background, opacity: +e.currentTarget.value })}
        />
      </div>

      <button
        onClick={() => applyAndSave({ type: 'preset', url: '', blur: 0, opacity: 0.85 })}
        className="text-xs self-start"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-muted)', padding: 0 }}
      >
        ✕ Сбросить фон
      </button>
    </section>
  )
}

function PasswordSection() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [changePassword, { isLoading, error }] = useChangePasswordMutation()
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    if (newPassword !== confirmPassword) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    try {
      await changePassword({ oldPassword, newPassword }).unwrap()
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <section>
      <SectionTitle>Смена пароля</SectionTitle>
      <form onSubmit={save} className="flex flex-col gap-2">
        <input
          type="password" className="dp-input" placeholder="Текущий пароль"
          value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required
        />
        <input
          type="password" className="dp-input" placeholder="Новый пароль (не короче 6 символов)"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required
        />
        <input
          type="password" className="dp-input" placeholder="Повторите новый пароль"
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
        />
        {mismatch && <div className="dp-error">Новый пароль и повтор не совпадают</div>}
        {error && <div className="dp-error">{extractApiError(error, 'Не удалось сменить пароль')}</div>}
        <div className="flex items-center gap-2">
          <button type="submit" className="dp-btn-primary text-xs self-start" disabled={isLoading}>
            {isLoading ? 'Сохраняем…' : 'Сменить пароль'}
          </button>
          {saved && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Пароль изменён</span>}
        </div>
      </form>
    </section>
  )
}

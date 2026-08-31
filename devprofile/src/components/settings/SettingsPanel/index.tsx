/*
  SettingsPanel — единая панель настроек аккаунта. Заменяет старый
  BackgroundEditor (тот же shell/анимация — slideUpVariants, overlay,
  bottom-sheet) и добавляет то, что не спрашивается при регистрации:
  аватар, био, локацию, GitHub/Steam, фон, смену пароля.

  Каждая секция сохраняется отдельно (своя кнопка «Сохранить») —
  так меньше риска затереть одно поле пока правишь другое.
*/

import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setSettingsOpen } from '../../../store/slices/uiSlice'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { useModalHistoryClose } from '../../../hooks/useModalHistoryClose'
import { useChangePasswordMutation } from '../../../store/api/backendApi'
import { useLazyResolveVanityUrlQuery } from '../../../store/api/steamApi'
import { parseSteamInput } from '../../../hooks/useSteam'
import { HelpTooltipIcon } from '../../shared/HelpTooltipIcon'
import { Avatar } from '../../shared/Avatar'
import { STEAM_API_KEY_HELP_SECTIONS } from '../../../config/steamHelp'
import { BACKGROUND_PRESETS, LOCATION_OPTIONS, LOCATION_OTHER, TIMEZONE_OPTIONS } from '../../../config/constants'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'
import { extractApiError } from '../../../utils/apiError'
import type { AuthUser, MessagingPrivacy } from '../../../types/auth'
import { DEFAULT_BACKGROUND, type BackgroundConfig } from '../../../types/profile'

export function SettingsPanel() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.ui.isSettingsOpen)
  const user = useAppSelector((state) => state.auth.user)

  const onClose = useCallback(() => dispatch(setSettingsOpen(false)), [dispatch])
  const close = useModalHistoryClose(isOpen, onClose, 'settings-panel')

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
              <PrivacySection user={user} />
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
        <Avatar src={preview} name={user.displayName} size={64} />
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

// Пустая строка ('') — «не задано», сервер хранит это как null и клиент
// падает на прежнее поведение (Dev). Порядок и id — как в SectionTabs
const DEFAULT_SECTION_OPTIONS = [
  { id: 'general', label: 'General' },
  { id: 'profile', label: 'Dev' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'games', label: 'Games' },
]

// Если сохранённая локация не входит в список городов — это либо ничего
// не выбрано, либо раньше ввели что-то своё через «Другое»
function initialLocationChoice(location: string | null): string {
  if (!location) return ''
  return (LOCATION_OPTIONS as readonly string[]).includes(location) ? location : LOCATION_OTHER
}

function PersonalInfoSection({ user }: { user: AuthUser }) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [bio, setBio] = useState(user.bio ?? '')
  const [locationChoice, setLocationChoice] = useState(() => initialLocationChoice(user.location))
  const [customLocation, setCustomLocation] = useState(() =>
    locationChoice === LOCATION_OTHER ? (user.location ?? '') : ''
  )
  const [timezone, setTimezone] = useState(user.timezone ?? '')
  const [defaultSection, setDefaultSection] = useState(user.defaultSection ?? '')
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    const location = locationChoice === LOCATION_OTHER ? customLocation : locationChoice
    try {
      await updateProfile({ displayName, bio, location, timezone: timezone || null, defaultSection })
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

        <select
          className="dp-input" value={locationChoice}
          onChange={(e) => setLocationChoice(e.target.value)}
        >
          <option value="">Локация не выбрана</option>
          {LOCATION_OPTIONS.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
          <option value={LOCATION_OTHER}>Другое…</option>
        </select>
        {locationChoice === LOCATION_OTHER && (
          <input
            type="text" className="dp-input" placeholder="Укажите город" autoFocus
            value={customLocation} onChange={(e) => setCustomLocation(e.target.value)}
          />
        )}

        <select
          className="dp-input" value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          <option value="">Часовой пояс не выбран (время браузера)</option>
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>

        <textarea
          className="dp-input" placeholder="О себе" rows={2}
          value={bio} onChange={(e) => setBio(e.target.value)}
        />

        <select
          className="dp-input" value={defaultSection}
          onChange={(e) => setDefaultSection(e.target.value)}
        >
          <option value="">Вкладка по умолчанию: Dev</option>
          {DEFAULT_SECTION_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>Вкладка по умолчанию: {s.label}</option>
          ))}
        </select>

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

const STEAM_ID_HELP_SECTIONS = [
  {
    title: 'Где взять логин',
    body: 'Steam → «Мой кошелёк» → под строкой «Пополнить баланс» есть строка «Пополнить баланс кошелька "логин"» — это и есть ваш логин.',
  },
  {
    title: 'Где взять SteamID64',
    body: 'Скопируйте полную ссылку на свой профиль Steam, откройте steamdb.com/ru/tools/steam-id-finder и вставьте ссылку в поисковую строку — сайт покажет SteamID64.',
  },
]

function ConnectedAccountsSection({ user }: { user: AuthUser }) {
  const [githubUsername, setGithubUsername] = useState(user.githubUsername ?? '')
  const [steamId, setSteamId] = useState(user.steamId ?? '')
  const [steamApiKey, setSteamApiKey] = useState('')
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [resolveVanityUrl, { isFetching: isResolving }] = useLazyResolveVanityUrlQuery()
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setResolveError(null)

    /*
      Поле принимает логин/ссылку на профиль, а не только готовый
      SteamID64 — резолвим через Steam Web API перед сохранением,
      чтобы дальше по коду (games/status/achievements) везде был
      уже готовый числовой id.
    */
    let resolvedSteamId = steamId
    if (steamId) {
      const parsed = parseSteamInput(steamId)
      if (parsed.kind === 'vanity') {
        try {
          resolvedSteamId = await resolveVanityUrl(parsed.value).unwrap()
        } catch (err) {
          setResolveError(extractApiError(err, 'Профиль Steam не найден — проверь логин'))
          return
        }
      } else {
        resolvedSteamId = parsed.value
      }
    }

    try {
      // Поле ключа маскированное и не подгружает текущее значение —
      // отправляем его только если реально что-то ввели, иначе не
      // трогаем то, что уже сохранено (см. users.ts PATCH /me)
      await updateProfile({
        githubUsername,
        steamId: resolvedSteamId,
        ...(steamApiKey ? { steamApiKey } : {}),
      })
      setSteamId(resolvedSteamId)
      setSteamApiKey('')
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  async function removeApiKey() {
    setSaved(false)
    try {
      await updateProfile({ steamApiKey: '' })
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
        <div className="relative">
          <input
            type="text" className="dp-input" placeholder="Steam: логин, ссылка на профиль или SteamID64"
            style={{ paddingRight: 34 }}
            value={steamId} onChange={(e) => setSteamId(e.target.value)}
          />
          <HelpTooltipIcon sections={STEAM_ID_HELP_SECTIONS} portalKey="steam-id-help-tooltip" />
        </div>
        <div className="relative">
          <input
            type="password" className="dp-input"
            placeholder={user.hasSteamApiKey ? 'Steam API ключ сохранён — введите новый, чтобы заменить' : 'Steam API ключ (для блока «Достижения»)'}
            style={{ paddingRight: 34 }}
            value={steamApiKey} onChange={(e) => setSteamApiKey(e.target.value)}
          />
          <HelpTooltipIcon sections={STEAM_API_KEY_HELP_SECTIONS} portalKey="steam-api-key-help-tooltip" />
        </div>
        {user.hasSteamApiKey && (
          <button
            type="button" onClick={removeApiKey}
            className="text-xs self-start"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-muted)', padding: 0 }}
          >
            ✕ Удалить сохранённый ключ
          </button>
        )}
        {resolveError && <div className="dp-error">{resolveError}</div>}
        {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить')}</div>}
        <div className="flex items-center gap-2">
          <button type="submit" className="dp-btn-primary text-xs self-start" disabled={isLoading || isResolving}>
            {isResolving ? 'Ищем профиль…' : isLoading ? 'Сохраняем…' : 'Сохранить'}
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

const PRIVACY_OPTIONS: { value: MessagingPrivacy; label: string; hint: string }[] = [
  { value: 'EVERYONE', label: 'Все пользователи', hint: 'Написать первым может кто угодно' },
  { value: 'FRIENDS_ONLY', label: 'Только друзья', hint: 'Не-друг может отправить только заявку в друзья с одним сообщением' },
  { value: 'NOBODY', label: 'Никто', hint: 'Писать могут только уже добавленные друзья' },
]

function PrivacySection({ user }: { user: AuthUser }) {
  const [value, setValue] = useState<MessagingPrivacy>(user.messagingPrivacy)
  const [updateProfile, { isLoading, error }] = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaved(false)
    try {
      await updateProfile({ messagingPrivacy: value })
      setSaved(true)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <section>
      <SectionTitle>Кто может написать мне первым</SectionTitle>
      <div className="flex flex-col gap-2">
        {PRIVACY_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 text-xs" style={{ cursor: 'pointer' }}>
            <input
              type="radio" name="messagingPrivacy" className="mt-0.5"
              checked={value === opt.value} onChange={() => setValue(opt.value)}
            />
            <span>
              <span style={{ color: 'var(--dp-text-white)' }}>{opt.label}</span>
              {' — '}
              <span style={{ color: 'var(--dp-text-muted)' }}>{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <div className="dp-error mt-2">{extractApiError(error, 'Не удалось сохранить')}</div>}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={save} className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {saved && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>✓ Сохранено</span>}
      </div>
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

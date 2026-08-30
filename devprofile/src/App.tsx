/*
  App.tsx — финальная версия клиентской части.

  Хуки которые вызываем на верхнем уровне:
  - useBadges()       → вычисляет бейджи из GitHub + Steam данных
  - useSmartStatus()  → определяет статус из Steam + эвристики
  - usePresence()     → Page Visibility API — статус при скрытии вкладки

  Все три хука только пишут в Redux store через dispatch.
  Компоненты только читают из store — нет prop drilling.
*/

import { useBadges }      from './hooks/useBadges'
import { useSmartStatus } from './hooks/useSmartStatus'
import { usePresence }    from './hooks/usePresence'
import { usePageTitle } from './hooks/usePageTitle'
import { useFitnessBadges } from './hooks/useFitnessBadges'
import { useFitnessRating } from './hooks/useFitnessRating'
import { useSyncAuthUser } from './hooks/useSyncAuthUser'

import { useAppSelector, useAppDispatch } from './hooks/redux'
import { logout } from './store/slices/authSlice'
import { toggleSettings } from './store/slices/uiSlice'

import { Background }       from './components/layout/Background'
import { AppBoard }         from './components/layout/AppBoard'
import { SectionTabs }      from './components/layout/SectionTabs'
import { ProfileHeader }    from './components/profile/ProfileHeader'
import { StatusBar }        from './components/profile/StatusBar'
import { FavoriteGamesPicker } from './components/activity/FavoriteGamesPicker'
import { AuthGate }         from './components/auth/AuthGate'
import { SettingsPanel }    from './components/settings/SettingsPanel'

function App() {
  /*
    Хуки-источники данных для статуса, dev-бейджей и фитнес-рейтинга.
    Порядок важен: useSmartStatus читает Steam данные, которые уже
    начали загружаться в useBadges; useFitnessRating читает бейджи,
    посчитанные useFitnessBadges (см. комментарии в самих хуках).
  */
  useBadges()
  useSmartStatus()
  usePresence()
  usePageTitle()
  useFitnessBadges()
  useFitnessRating()
  useSyncAuthUser()

  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()

  return (
    <>
      {/* Слой 1: Фон — position fixed, за всем контентом */}
      <Background />

      {/* Слой 2: Настройки профиля / выбор любимых игр — выезжают снизу поверх всего */}
      <SettingsPanel />
      <FavoriteGamesPicker />

      {/* Слой 3: без аккаунта — экран входа/регистрации вместо профиля */}
      {!token && <AuthGate />}

      {token && (
      <AppBoard
        header={
          <>
            <ProfileHeader />
            <StatusBar />
            <div className="flex items-center justify-between">
              <SectionTabs />
              <div className="flex items-center gap-2 mr-2">
                <button onClick={() => dispatch(toggleSettings())} className="dp-btn-ghost text-xs">
                  ⚙ Настройки
                </button>
                <button onClick={() => dispatch(logout())} className="dp-btn-ghost text-xs">
                  Выйти
                </button>
              </div>
            </div>
          </>
        }
      />
      )}
    </>
  )
}

export default App
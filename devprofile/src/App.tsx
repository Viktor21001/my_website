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
import { useSocket } from './hooks/useSocket'

import { useAppSelector, useAppDispatch } from './hooks/redux'
import { logout } from './store/slices/authSlice'
import { toggleSettings, toggleAdminPanel, toggleSocialHub } from './store/slices/uiSlice'
import { useGetFriendRequestsQuery, useGetConversationsQuery } from './store/api/backendApi'

import { Background }       from './components/layout/Background'
import { AppBoard }         from './components/layout/AppBoard'
import { SectionTabs }      from './components/layout/SectionTabs'
import { ProfileHeader }    from './components/profile/ProfileHeader'
import { StatusBar }        from './components/profile/StatusBar'
import { FavoriteGamesPicker } from './components/activity/FavoriteGamesPicker'
import { AuthGate }         from './components/auth/AuthGate'
import { SettingsPanel }    from './components/settings/SettingsPanel'
import { AdminPanel }       from './components/admin/AdminPanel'
import { SocialHub }        from './components/social/SocialHub'
import { GroupDetail }      from './components/groups/GroupDetail'
import { SearchBar }        from './components/search/SearchBar'
import { NotificationBell } from './components/notifications/NotificationBell'

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
  useSocket()

  const token = useAppSelector((state) => state.auth.token)
  const role = useAppSelector((state) => state.auth.user?.role)
  const dispatch = useAppDispatch()

  // Только для бейджа на кнопке «Сообщения» в шапке — сами вкладки Чаты/
  // Заявки внутри SocialHub грузят свои данные независимо от этого
  const { data: incomingRequests } = useGetFriendRequestsQuery({ direction: 'incoming' }, { skip: !token })
  const { data: conversationsPage } = useGetConversationsQuery(undefined, { skip: !token })
  const pendingFriendRequests = incomingRequests?.requests.length ?? 0
  const unreadMessages = conversationsPage?.conversations.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0
  const socialBadgeCount = pendingFriendRequests + unreadMessages

  return (
    <>
      {/* Слой 1: Фон — position fixed, за всем контентом */}
      <Background />

      {/* Слой 2: Настройки профиля / выбор любимых игр / админ-панель / друзья — выезжают снизу поверх всего */}
      <SettingsPanel />
      <FavoriteGamesPicker />
      <AdminPanel />
      <SocialHub />
      <GroupDetail />

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
                <SearchBar />
                <NotificationBell />
                {(role === 'ADMIN' || role === 'CREATOR') && (
                  <button onClick={() => dispatch(toggleAdminPanel())} className="dp-btn-ghost text-xs">
                    🛡 Админ-панель
                  </button>
                )}
                <button onClick={() => dispatch(toggleSocialHub())} className="dp-btn-ghost text-xs relative">
                  💬 Сообщения
                  {socialBadgeCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-[10px] font-bold rounded-full"
                      style={{ minWidth: 16, height: 16, padding: '0 3px', background: 'var(--dp-red)', color: '#fff' }}
                    >
                      {socialBadgeCount}
                    </span>
                  )}
                </button>
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
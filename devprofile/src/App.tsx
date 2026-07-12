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

import { Background }       from './components/layout/Background'
import { BackgroundEditor } from './components/layout/BackgroundEditor'
import { PageWrapper }      from './components/layout/PageWrapper'
import { ProfileHeader }    from './components/profile/ProfileHeader'
import { StatusBar }        from './components/profile/StatusBar'
import { BadgesRow }        from './components/profile/BadgesRow'
import { RecentActivity }   from './components/activity/RecentActivity'
import { FavoriteGames }    from './components/activity/FavoriteGames'
import { GithubStats }      from './components/stats/GithubStats'
import { SteamStats }       from './components/stats/SteamStats'
import { ComingSoon }       from './components/shared/ComingSoon'

function App() {
  /*
    Три хука — три источника данных для статуса и бейджей.
    Порядок важен: useSmartStatus читает Steam данные
    которые уже начали загружаться в useBadges.
  */
  useBadges()
  useSmartStatus()
  usePresence()
  usePageTitle()

  return (
    <>
      {/* Слой 1: Фон — position fixed, за всем контентом */}
      <Background />

      {/* Слой 2: Редактор фона — выезжает снизу поверх всего */}
      <BackgroundEditor />

      {/* Слой 3: Основной контент с анимациями */}
      <PageWrapper
        header={
          <>
            <ProfileHeader />
            <StatusBar />
          </>
        }

        leftColumn={
          <>
            <BadgesRow />
            <RecentActivity />
            <ComingSoon title="Комментарии" icon="💬" />
          </>
        }

        rightColumn={
          <>
            <GithubStats />
            <SteamStats />
            <FavoriteGames />
            <ComingSoon title="Друзья"  icon="👥" />
            <ComingSoon title="Группы"  icon="🏠" />
          </>
        }
      />
    </>
  )
}

export default App
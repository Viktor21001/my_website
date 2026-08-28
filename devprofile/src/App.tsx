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

import { useAppSelector, useAppDispatch } from './hooks/redux'
import { logout } from './store/slices/authSlice'

import { Background }       from './components/layout/Background'
import { BackgroundEditor } from './components/layout/BackgroundEditor'
import { PageWrapper }      from './components/layout/PageWrapper'
import { SectionTabs }      from './components/layout/SectionTabs'
import { ProfileHeader }    from './components/profile/ProfileHeader'
import { StatusBar }        from './components/profile/StatusBar'
import { BadgesRow }        from './components/profile/BadgesRow'
import { RecentActivity }   from './components/activity/RecentActivity'
import { FavoriteGames }    from './components/activity/FavoriteGames'
import { GithubStats }      from './components/stats/GithubStats'
import { SteamStats }       from './components/stats/SteamStats'
import { ComingSoon }       from './components/shared/ComingSoon'
import { AuthGate }         from './components/auth/AuthGate'

import { FitnessStatsStrip }    from './components/fitness/FitnessStatsStrip'
import { WorkoutLog }           from './components/fitness/WorkoutLog'
import { AgeGroupLeaderboard }  from './components/fitness/AgeGroupLeaderboard'
import { ExerciseLibrary }      from './components/fitness/ExerciseLibrary'
import { FitnessBadgesRow }     from './components/fitness/FitnessBadgesRow'
import { WorkoutTimer }         from './components/fitness/WorkoutTimer'
import { InBodyPanel }          from './components/fitness/InBodyPanel'

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

  const activeSection = useAppSelector((state) => state.ui.activeSection)
  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()

  return (
    <>
      {/* Слой 1: Фон — position fixed, за всем контентом */}
      <Background />

      {/* Слой 2: Редактор фона — выезжает снизу поверх всего */}
      <BackgroundEditor />

      {/* Слой 3: без аккаунта — экран входа/регистрации вместо профиля */}
      {!token && <AuthGate />}

      {token && (
      <PageWrapper
        header={
          <>
            <ProfileHeader />
            <StatusBar />
            <div className="flex items-center justify-between">
              <SectionTabs />
              <button onClick={() => dispatch(logout())} className="dp-btn-ghost text-xs mr-2">
                Выйти
              </button>
            </div>
          </>
        }

        leftColumn={
          activeSection === 'profile' ? (
            <>
              <BadgesRow />
              <RecentActivity />
              <ComingSoon title="Комментарии" icon="💬" />
            </>
          ) : (
            <>
              <FitnessStatsStrip />
              <WorkoutLog />
              <AgeGroupLeaderboard />
              <ExerciseLibrary />
              <ComingSoon title="Хобби" icon="🎨" />
              <ComingSoon title="Любимые фильмы" icon="🎬" />
              <ComingSoon title="Игры и достижения" icon="🎮" />
            </>
          )
        }

        rightColumn={
          activeSection === 'profile' ? (
            <>
              <GithubStats />
              <SteamStats />
              <FavoriteGames />
              <ComingSoon title="Друзья"  icon="👥" />
              <ComingSoon title="Группы"  icon="🏠" />
            </>
          ) : (
            <>
              <FitnessBadgesRow />
              <WorkoutTimer />
              <InBodyPanel />
              <ComingSoon title="Чаты" icon="💬" />
            </>
          )
        }
      />
      )}
    </>
  )
}

export default App
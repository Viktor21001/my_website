import { Background } from './components/layout/Background'
import { BackgroundEditor } from './components/layout/BackgroundEditor'
import { PageWrapper } from './components/layout/PageWrapper'
import { ProfileHeader } from './components/profile/ProfileHeader'
import { StatusBar } from './components/profile/StatusBar'
import { BadgesRow } from './components/profile/BadgesRow'
import { RecentActivity } from './components/activity/RecentActivity'
import { FavoriteGames } from './components/activity/FavoriteGames'
import { GithubStats } from './components/stats/GithubStats'
import { ComingSoon } from './components/shared/ComingSoon'

function App() {
  return (
    <>
      <Background />
      <BackgroundEditor />

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
            {/* Блок статистики GitHub — новый в этой фазе */}
            <GithubStats />
            <FavoriteGames />
            <ComingSoon title="Друзья" icon="👥" />
            <ComingSoon title="Группы" icon="🏠" />
          </>
        }
      />
    </>
  )
}

export default App
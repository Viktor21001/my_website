/*
  App.tsx — собираем все компоненты вместе.
  
  PageWrapper получает три части:
  - header      — ProfileHeader + StatusBar
  - leftColumn  — BadgesRow + RecentActivity
  - rightColumn — уровень + FavoriteGames + заглушки
  
  В Фазе 2 сюда добавим компонент Background.
*/

import { PageWrapper } from './components/layout/PageWrapper'
import { ProfileHeader } from './components/profile/ProfileHeader'
import { StatusBar } from './components/profile/StatusBar'
import { BadgesRow } from './components/profile/BadgesRow'
import { RecentActivity } from './components/activity/RecentActivity'
import { FavoriteGames } from './components/activity/FavoriteGames'
import { ComingSoon } from './components/shared/ComingSoon'

function App() {
  return (
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
          <FavoriteGames />
          <ComingSoon title="Друзья" icon="👥" />
          <ComingSoon title="Группы" icon="🏠" />
        </>
      }
    />
  )
}

export default App
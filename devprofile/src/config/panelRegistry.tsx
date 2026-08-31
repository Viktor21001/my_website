/*
  panelRegistry — единственный источник правды о том, какие панели
  существуют на каждой вкладке (Dev/Fitness/Games) и в каком порядке они
  идут по умолчанию. Раньше этот список был литеральным JSX прямо в
  App.tsx; вынесен сюда, чтобы у каждой панели появился стабильный id —
  без него нельзя ни перетаскивать (dnd-kit сортирует по id), ни хранить
  порядок в БД (см. usePanelOrder, PanelBoard).

  BadgesRow используется дважды с разными пропсами (DEV_BADGE_IDS /
  GAME_BADGE_IDS) — это две отдельные записи реестра с разными id,
  а не один переиспользуемый узел.
*/

import type { ReactNode } from 'react'
import type { ActiveSection } from '../store/slices/uiSlice'
import { BadgesRow } from '../components/profile/BadgesRow'
import { RecentActivity } from '../components/activity/RecentActivity'
import { GameLibrary } from '../components/activity/GameLibrary'
import { FavoriteGames } from '../components/activity/FavoriteGames'
import { AchievementsLibrary } from '../components/activity/AchievementsLibrary'
import { GithubStats } from '../components/stats/GithubStats'
import { SteamStats } from '../components/stats/SteamStats'
import { SteamAchievements } from '../components/stats/SteamAchievements'
import { ComingSoon } from '../components/shared/ComingSoon'
import { FriendsWidget } from '../components/social/FriendsWidget'
import { ChatsWidget } from '../components/social/ChatsWidget'
import { GroupsWidget } from '../components/social/GroupsWidget'
import { FitnessStatsStrip } from '../components/fitness/FitnessStatsStrip'
import { WorkoutLog } from '../components/fitness/WorkoutLog'
import { AgeGroupLeaderboard } from '../components/fitness/AgeGroupLeaderboard'
import { ExerciseLibrary } from '../components/fitness/ExerciseLibrary'
import { FitnessBadgesRow } from '../components/fitness/FitnessBadgesRow'
import { Stopwatch } from '../components/fitness/Stopwatch'
import { InBodyPanel } from '../components/fitness/InBodyPanel'
import { ProfileOverview } from '../components/profile/ProfileOverview'
import { DEV_BADGE_IDS, GAME_BADGE_IDS } from './badges'

export interface PanelEntry {
  id: string
  node: ReactNode
}

export interface SectionPanelDefaults {
  left: PanelEntry[]
  right: PanelEntry[]
}

export const PANEL_REGISTRY: Record<ActiveSection, SectionPanelDefaults> = {
  // Пустых "В разработке" заглушек здесь нарочно нет — вкладка для того
  // и существует, чтобы пользователь сам наполнял её перетаскиванием
  // панелей с других вкладок; пустое место тут ожидаемо
  general: {
    left: [
      { id: 'general-badges', node: <BadgesRow /> },
      { id: 'general-fitness-badges', node: <FitnessBadgesRow /> },
    ],
    right: [
      { id: 'general-overview', node: <ProfileOverview /> },
    ],
  },
  profile: {
    left: [
      { id: 'dev-badges', node: <BadgesRow ids={DEV_BADGE_IDS} /> },
      { id: 'dev-activity', node: <RecentActivity /> },
      { id: 'dev-comments', node: <ComingSoon title="Комментарии" icon="💬" /> },
    ],
    right: [
      { id: 'dev-github', node: <GithubStats /> },
      { id: 'dev-friends', node: <FriendsWidget /> },
      { id: 'dev-groups', node: <GroupsWidget /> },
    ],
  },
  fitness: {
    left: [
      { id: 'fit-stats-strip', node: <FitnessStatsStrip /> },
      { id: 'fit-workout-log', node: <WorkoutLog /> },
      { id: 'fit-age-leaderboard', node: <AgeGroupLeaderboard /> },
      { id: 'fit-exercise-library', node: <ExerciseLibrary /> },
      { id: 'fit-hobby', node: <ComingSoon title="Хобби" icon="🎨" /> },
      { id: 'fit-movies', node: <ComingSoon title="Любимые фильмы" icon="🎬" /> },
    ],
    right: [
      { id: 'fit-badges', node: <FitnessBadgesRow /> },
      { id: 'fit-stopwatch', node: <Stopwatch /> },
      { id: 'fit-inbody', node: <InBodyPanel /> },
      { id: 'fit-chats', node: <ChatsWidget /> },
    ],
  },
  games: {
    left: [
      { id: 'games-badges', node: <BadgesRow ids={GAME_BADGE_IDS} /> },
      { id: 'games-achievements', node: <SteamAchievements /> },
      { id: 'games-library', node: <GameLibrary /> },
    ],
    right: [
      { id: 'games-steam-stats', node: <SteamStats /> },
      { id: 'games-favorites', node: <FavoriteGames /> },
      { id: 'games-achievements-library', node: <AchievementsLibrary /> },
    ],
  },
}

// id -> запись, обе колонки вместе — для резолва сохранённого порядка обратно в узлы
export const PANEL_LOOKUP: Record<ActiveSection, Record<string, PanelEntry>> = Object.fromEntries(
  (Object.entries(PANEL_REGISTRY) as [ActiveSection, SectionPanelDefaults][]).map(([section, { left, right }]) => [
    section,
    Object.fromEntries([...left, ...right].map((entry) => [entry.id, entry])),
  ])
) as Record<ActiveSection, Record<string, PanelEntry>>

/*
  То же самое, но одним плоским объектом по ВСЕМ вкладкам сразу. Нужен
  отдельно от PANEL_LOOKUP: панель можно перетащить на чужую вкладку
  (id остаётся тем же, «домашний» реестр — той вкладки, где она была
  заведена изначально), поэтому проверка «жив ли ещё этот id» и резолв
  id -> узел в usePanelOrder должны смотреть по всем вкладкам сразу, а не
  только в реестре текущей — иначе перенесённая панель после каждой новой
  загрузки страницы считалась бы «неизвестной» и молча выбрасывалась.
*/
export const GLOBAL_PANEL_LOOKUP: Record<string, PanelEntry> = Object.assign({}, ...Object.values(PANEL_LOOKUP))

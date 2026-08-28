/*
  useGithub — единая точка входа для всех GitHub данных.
  
  Почему выносим в хук а не вызываем RTK Query прямо в компонентах?
  1. Компоненты не знают откуда пришли данные — сегодня GitHub API,
     завтра наш бэкенд. Меняем только этот хук.
  2. Логика обработки данных (calcTopLanguages, фильтрация событий)
     в одном месте, не размазана по компонентам.
  3. username берётся из Redux store — компонентам не нужно
     знать как называется текущий пользователь.
*/

import { useAppSelector } from './redux'
import {
  useGetRecentReposQuery,
  useGetEventsQuery,
  useGetRepoLanguagesQuery,
  calcTopLanguages,
} from '../store/api/githubApi'
import type { GithubRepo } from '../types/github'
import { LANGUAGE_COLORS } from '../config/constants'

type ActivityFeedItem = {
  id: string
  type: 'commit' | 'pr' | 'repo_created'
  repoName: string
  message: string
  createdAt: string
}

// Хук для получения последних репозиториев с языками
export function useRecentRepos() {
  const username = useAppSelector(
    (state) => state.auth.user?.githubUsername ?? ''
  )

  /*
    useGetRecentReposQuery — RTK Query хук.
    Автоматически:
    - делает fetch при монтировании компонента
    - кеширует результат (повторный вызов не уйдёт в сеть)
    - возвращает { data, isLoading, isError, isFetching }
    
    skip: !username — не делаем запрос если username не задан
  */
  const {
    data: repos = [],
    isLoading,
    isError,
    isFetching,
  } = useGetRecentReposQuery(username, { skip: !username })

  return { repos, isLoading, isError, isFetching, username }
}

// Хук для получения языков конкретного репо
export function useRepoLanguages(fullName: string) {
  const {
    data: languages = {},
    isLoading,
  } = useGetRepoLanguagesQuery(fullName, { skip: !fullName })

  /*
    Конвертируем { "TypeScript": 45820, "CSS": 12300 }
    в массив TopLanguage с процентами и цветами.
    Логика в одном месте — не дублируем в каждой карточке.
  */
  const total = Object.values(languages).reduce((a, b) => a + b, 0)

  const topLanguages = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([name, bytes]) => ({
      name,
      percent: Math.round((bytes / total) * 100),
      color: LANGUAGE_COLORS[name] ?? '#8b8b8b',
    }))

  return { topLanguages, isLoading }
}

// Хук для ленты активности (коммиты, PR, создание репо)
export function useActivityFeed() {
  const username = useAppSelector(
    (state) => state.auth.user?.githubUsername ?? ''
  )

  const {
    data: events = [],
    isLoading,
    isError,
  } = useGetEventsQuery(username, { skip: !username })

  /*
    Преобразуем сырые события GitHub в удобный формат для UI.
    PushEvent    → список коммитов
    PullRequestEvent → строка с действием
    CreateEvent  → создание репо или ветки
  */
  const feedItems: ActivityFeedItem[] = events.flatMap((event): ActivityFeedItem[] => {
    if (event.type === 'PushEvent') {
      return (event.payload.commits ?? []).slice(0, 2).map((commit) => ({
        id: `${event.id}-${commit.sha}`,
        type: 'commit' as const,
        repoName: event.repoName,
        message: commit.message.split('\n')[0], // только первая строка
        createdAt: event.createdAt,
      }))
    }

    if (event.type === 'PullRequestEvent') {
      return [{
        id: event.id,
        type: 'pr' as const,
        repoName: event.repoName,
        message: `PR ${event.payload.action ?? ''}`,
        createdAt: event.createdAt,
      }]
    }

    if (event.type === 'CreateEvent' && event.payload.ref_type === 'repository') {
      return [{
        id: event.id,
        type: 'repo_created' as const,
        repoName: event.repoName,
        message: 'Создан репозиторий',
        createdAt: event.createdAt,
      }]
    }

    return []
  })

  return { feedItems, isLoading, isError }
}

// Хук для топ языков по всем репозиториям (для правой колонки)
export function useTopLanguages() {
  const username = useAppSelector(
    (state) => state.auth.user?.githubUsername ?? ''
  )

  const { data: repos = [], isLoading } = useGetRecentReposQuery(
    username,
    { skip: !username }
  )

  const topLanguages = calcTopLanguages(repos as GithubRepo[])

  return { topLanguages, isLoading }
}
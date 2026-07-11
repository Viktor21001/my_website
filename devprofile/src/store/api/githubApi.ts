import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { GithubRepo, GithubEvent, GithubProfile, TopLanguage } from '../../types/github'
import { LANGUAGE_COLORS } from '../../config/constants'

/*
  createApi — создаёт набор хуков для запросов к API.
  Из каждого endpoint RTK Query автоматически генерирует хук:
    getProfile     → useGetProfileQuery('username')
    getRecentRepos → useGetRecentReposQuery('username')
  
  Эти хуки сами управляют loading / error / data / кешем.
  Не нужно писать useState + useEffect + fetch вручную.
  
  Документация: https://redux-toolkit.js.org/rtk-query/overview
*/
export const githubApi = createApi({
  reducerPath: 'githubApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.github.com',
    prepareHeaders: (headers) => {
      // Без токена: 60 запросов в час
      // С токеном: 5000 запросов в час
      // Токен получить: https://github.com/settings/tokens
      // Потом добавим: headers.set('Authorization', `Bearer ${token}`)
      headers.set('Authorization', `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`)
      return headers
    },
  }),

  endpoints: (builder) => ({

    // Профиль пользователя
    // transformResponse — преобразуем ответ GitHub в наш тип GithubProfile
    // чтобы компоненты не зависели от структуры GitHub API напрямую
    getProfile: builder.query<GithubProfile, string>({
      query: (username) => `/users/${username}`,
      transformResponse: (raw: any): GithubProfile => ({
        login:       raw.login,
        avatarUrl:   raw.avatar_url,
        bio:         raw.bio,
        location:    raw.location,
        followers:   raw.followers,
        following:   raw.following,
        publicRepos: raw.public_repos,
        createdAt:   raw.created_at,
      }),
    }),

    // Последние репозитории отсортированные по дате пуша
    getRecentRepos: builder.query<GithubRepo[], string>({
      query: (username) =>
        `/users/${username}/repos?sort=pushed&per_page=6`,
      transformResponse: (raw: any[]): GithubRepo[] =>
        raw.map((r) => ({
          id:          r.id,
          name:        r.name,
          fullName:    r.full_name,
          description: r.description,
          url:         r.html_url,
          stars:       r.stargazers_count,
          forks:       r.forks_count,
          language:    r.language,
          languages:   {},         // догружаем отдельным запросом ниже
          pushedAt:    r.pushed_at,
          createdAt:   r.created_at,
          topics:      r.topics ?? [],
          isPrivate:   r.private,
        })),
    }),

    // Языки конкретного репо — { "TypeScript": 45820, "CSS": 12300 }
    // Вызываем для каждого репо отдельно
    // RTK Query кеширует результат — повторный запрос не уйдёт в сеть
    getRepoLanguages: builder.query<Record<string, number>, string>({
      query: (fullName) => `/repos/${fullName}/languages`,
    }),

    // Публичные события: коммиты, PR, создание репо
    getEvents: builder.query<GithubEvent[], string>({
      query: (username) =>
        `/users/${username}/events/public?per_page=30`,
      transformResponse: (raw: any[]): GithubEvent[] =>
        raw
          .filter((e) =>
            ['PushEvent', 'PullRequestEvent', 'CreateEvent'].includes(e.type)
          )
          .map((e) => ({
            id:        e.id,
            type:      e.type,
            repoName:  e.repo.name,
            createdAt: e.created_at,
            payload: {
              commits:  e.payload.commits,
              action:   e.payload.action,
              ref:      e.payload.ref,
              ref_type: e.payload.ref_type,
            },
          })),
    }),

  }),
})

export const {
  useGetProfileQuery,
  useGetRecentReposQuery,
  useGetRepoLanguagesQuery,
  useGetEventsQuery,
} = githubApi

/*
  Вспомогательная функция — считаем топ языков из массива репозиториев.
  Суммируем байты по всем репо и переводим в проценты.
  Используется в компоненте LanguageBar.
*/
export function calcTopLanguages(
  repos: GithubRepo[]
): TopLanguage[] {
  const totals: Record<string, number> = {}

  for (const repo of repos) {
    for (const [lang, bytes] of Object.entries(repo.languages)) {
      totals[lang] = (totals[lang] ?? 0) + bytes
    }
  }

  const total = Object.values(totals).reduce((a, b) => a + b, 0)

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, bytes]) => ({
      name,
      percent: Math.round((bytes / total) * 100),
      color:   LANGUAGE_COLORS[name] ?? '#8b8b8b',
    }))
}
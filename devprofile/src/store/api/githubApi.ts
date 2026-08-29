import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { GithubRepo, GithubEvent, GithubProfile, TopLanguage, ContributionsData } from '../../types/github'
import { LANGUAGE_COLORS } from '../../config/constants'

/*
  Календарь контрибуций (зелёные квадраты) REST API не отдаёт вообще —
  это поле есть только в GraphQL (contributionsCollection). Один POST на
  /graphql с тем же токеном, что и у REST-запросов выше.
*/
const CONTRIBUTIONS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 10) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        issueContributionsByRepository(maxRepositories: 10) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestContributionsByRepository(maxRepositories: 10) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
        pullRequestReviewContributionsByRepository(maxRepositories: 10) {
          repository { nameWithOwner url }
          contributions { totalCount }
        }
      }
    }
  }
`

interface GraphqlContributionsResponse {
  data: {
    user: {
      contributionsCollection: {
        totalCommitContributions: number
        totalIssueContributions: number
        totalPullRequestContributions: number
        totalPullRequestReviewContributions: number
        contributionCalendar: {
          totalContributions: number
          weeks: { contributionDays: { date: string; contributionCount: number; color: string }[] }[]
        }
        commitContributionsByRepository: RepoContribution[]
        issueContributionsByRepository: RepoContribution[]
        pullRequestContributionsByRepository: RepoContribution[]
        pullRequestReviewContributionsByRepository: RepoContribution[]
      } | null
    } | null
  }
}

interface RepoContribution {
  repository: { nameWithOwner: string; url: string }
  contributions: { totalCount: number }
}

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

    // Календарь контрибуций + разбивка коммиты/issues/PR/ревью + репозитории,
    // в которые был вклад — тот самый зелёный график с github.com
    getContributions: builder.query<ContributionsData, string>({
      query: (username) => ({
        url: '/graphql',
        method: 'POST',
        body: { query: CONTRIBUTIONS_QUERY, variables: { login: username } },
      }),
      transformResponse: (raw: GraphqlContributionsResponse): ContributionsData => {
        const cc = raw.data.user?.contributionsCollection
        if (!cc) {
          return { totalContributions: 0, weeks: [], totals: { commits: 0, issues: 0, pullRequests: 0, reviews: 0 }, contributedRepos: [] }
        }

        const weeks = cc.contributionCalendar.weeks.map((w) =>
          w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, color: d.color }))
        )

        // Один и тот же репозиторий может встретиться в нескольких списках
        // (коммит и код-ревью в одном репо) — схлопываем по nameWithOwner,
        // сортируем по суммарному вкладу, как в "Contributed to" на GitHub
        const repoWeights = new Map<string, { nameWithOwner: string; url: string; weight: number }>()
        const addRepos = (list: RepoContribution[]) => {
          for (const item of list) {
            const key = item.repository.nameWithOwner
            const existing = repoWeights.get(key)
            if (existing) existing.weight += item.contributions.totalCount
            else repoWeights.set(key, { nameWithOwner: key, url: item.repository.url, weight: item.contributions.totalCount })
          }
        }
        addRepos(cc.commitContributionsByRepository)
        addRepos(cc.issueContributionsByRepository)
        addRepos(cc.pullRequestContributionsByRepository)
        addRepos(cc.pullRequestReviewContributionsByRepository)

        const contributedRepos = [...repoWeights.values()]
          .sort((a, b) => b.weight - a.weight)
          .map(({ nameWithOwner, url }) => ({ nameWithOwner, url }))

        return {
          totalContributions: cc.contributionCalendar.totalContributions,
          weeks,
          totals: {
            commits: cc.totalCommitContributions,
            issues: cc.totalIssueContributions,
            pullRequests: cc.totalPullRequestContributions,
            reviews: cc.totalPullRequestReviewContributions,
          },
          contributedRepos,
        }
      },
    }),

  }),
})

export const {
  useGetProfileQuery,
  useGetRecentReposQuery,
  useGetRepoLanguagesQuery,
  useGetEventsQuery,
  useGetContributionsQuery,
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
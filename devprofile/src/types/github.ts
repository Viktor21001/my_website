/*
  Описываем только те поля которые отображаем в UI.
  GitHub API возвращает 50+ полей на репозиторий —
  берём только нужное чтобы не тащить лишнее в стейт.
*/

export interface GithubRepo {
  id: number
  name: string
  fullName: string                    // "username/repo-name"
  description: string | null
  url: string
  stars: number
  forks: number
  language: string | null             // основной язык
  languages: Record<string, number>   // { "TypeScript": 45820 }
  pushedAt: string                    // ISO дата последнего коммита
  createdAt: string
  topics: string[]
  isPrivate: boolean
}

export interface GithubEvent {
  id: string
  type: 'PushEvent' | 'PullRequestEvent' | 'CreateEvent' | 'WatchEvent' | 'ForkEvent'
  repoName: string
  createdAt: string
  payload: {
    commits?: Array<{ message: string; sha: string }>
    action?: string    // "opened", "closed", "merged"
    ref?: string
    ref_type?: string  // "repository", "branch", "tag"
  }
}

export interface GithubProfile {
  login: string
  avatarUrl: string
  bio: string | null
  location: string | null
  followers: number
  following: number
  publicRepos: number
  createdAt: string
}

export interface TopLanguage {
  name: string
  percent: number
  color: string // hex
}

// Календарь контрибуций — тот же зелёный квадратный график, что на github.com,
// строится из GraphQL contributionsCollection (REST такого не отдаёт)
export interface ContributionDay {
  date: string   // "2026-08-29"
  count: number
  color: string  // hex, уже посчитанный GitHub'ом под текущую тему аккаунта
}

export interface ContributedRepo {
  nameWithOwner: string // "owner/repo"
  url: string
}

export interface ContributionsData {
  totalContributions: number
  weeks: ContributionDay[][] // по 7 дней (вс-сб), недостающие дни в первой/последней неделе не приходят
  totals: {
    commits: number
    issues: number
    pullRequests: number
    reviews: number
  }
  contributedRepos: ContributedRepo[] // по убыванию суммарного вклада
}
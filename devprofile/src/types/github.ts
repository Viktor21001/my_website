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
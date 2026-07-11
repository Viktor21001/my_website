/*
  GithubStats — статистика GitHub в правой колонке.
  Показывает: количество репо, топ языков.
  
  Аналог блока "Значки" в Steam но с данными разработчика.
*/

import { useTopLanguages } from '../../../hooks/useGithub'
import { useGetProfileQuery } from '../../../store/api/githubApi'
import { useAppSelector } from '../../../hooks/redux'
import { LanguageBar } from '../LanguageBar'
import { SkeletonCard } from '../../shared/Card'

export function GithubStats() {
  const username = useAppSelector(
    (state) => state.profile.user.socialLinks.github ?? ''
  )

  /*
    Два отдельных запроса — профиль и языки.
    RTK Query выполняет их параллельно.
  */
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery(
    username,
    { skip: !username }
  )

  const { topLanguages, isLoading: langLoading } = useTopLanguages()

  if (profileLoading || langLoading) return <SkeletonCard />

  return (
    <div className="dp-panel overflow-hidden">
      <div className="dp-section-title">GitHub</div>

      <div className="p-3 flex flex-col gap-3">

        {/* Счётчики */}
        {profile && (
          <div className="flex gap-3">
            <Stat value={profile.publicRepos} label="Репо" />
            <Stat value={profile.followers}   label="Подписчики" />
            <Stat value={profile.following}   label="Подписки" />
          </div>
        )}

        {/* Топ языков */}
        {topLanguages.length > 0 && (
          <div>
            <div
              className="text-xs mb-2"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              Языки
            </div>
            <LanguageBar languages={topLanguages} showLabels={true} />
          </div>
        )}

        {/* Ссылка на GitHub */}
        {username && (
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noreferrer"
            className="dp-link text-xs"
          >
            Открыть профиль →
          </a>
        )}

      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <span
        className="text-base font-semibold"
        style={{ color: 'var(--dp-text-white)' }}
      >
        {value}
      </span>
      <span
        className="text-xs"
        style={{ color: 'var(--dp-text-muted)' }}
      >
        {label}
      </span>
    </div>
  )
}
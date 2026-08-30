import type { User } from '@prisma/client'
import { toClientAgeGroup } from './ageGroup'

/*
  Единая точка сериализации User -> JSON, которую отдаём клиенту.
  Общая для auth.ts (register/login/me) и users.ts (patch профиля) —
  раньше была только в auth.ts, теперь используется в двух местах.
*/
export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar,
    bio: user.bio,
    location: user.location,
    timezone: user.timezone,
    exerciseLibraryName: user.exerciseLibraryName,
    ageGroup: toClientAgeGroup(user.ageGroup),
    createdAt: user.createdAt,
    githubUsername: user.githubUsername,
    steamId: user.steamId,
    // Сам ключ клиенту не отдаём (это секрет пользователя, а не публичный
    // id) — только флаг, настроен ли он, для UI («блок достижений активен»)
    hasSteamApiKey: Boolean(user.steamApiKey),
    favoriteSteamAppIds: user.favoriteSteamAppIds,
    background: {
      type: user.backgroundType,
      url: user.backgroundUrl,
      blur: user.backgroundBlur,
      opacity: user.backgroundOpacity,
    },
  }
}

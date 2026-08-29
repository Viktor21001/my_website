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
    ageGroup: toClientAgeGroup(user.ageGroup),
    createdAt: user.createdAt,
    githubUsername: user.githubUsername,
    steamId: user.steamId,
    favoriteSteamAppIds: user.favoriteSteamAppIds,
    background: {
      type: user.backgroundType,
      url: user.backgroundUrl,
      blur: user.backgroundBlur,
      opacity: user.backgroundOpacity,
    },
  }
}

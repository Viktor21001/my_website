import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { SteamPlayer, SteamGame, GameAchievementSummary } from '../../types/steam'

/*
  baseUrl: '/steam-api' — запросы идут через Vite proxy.
  Proxy перенаправляет их на api.steampowered.com.
  Это обходит блокировку CORS в браузере.
  
  Ключ берём из .env файла.
  НИКОГДА не коммитим .env в Git — ключ утечёт!
*/
const KEY = import.meta.env.VITE_STEAM_API_KEY as string

// Сколько иконок последних полученных достижений показываем в превью — дальше "+N" в UI
const MAX_ACHIEVEMENT_ICONS = 5

export const steamApi = createApi({
  reducerPath: 'steamApi',

  baseQuery: fetchBaseQuery({
    baseUrl: '/steam-api',
  }),

  endpoints: (builder) => ({

    // Данные игрока: статус, никнейм, аватар, текущая игра
    getSteamPlayer: builder.query<SteamPlayer, string>({
      query: (steamId) =>
        `/ISteamUser/GetPlayerSummaries/v2/?key=${KEY}&steamids=${steamId}`,
      transformResponse: (raw: any): SteamPlayer => {
        const p = raw.response.players[0]
        return {
          steamId:      p.steamid,
          personaName:  p.personaname,
          profileUrl:   p.profileurl,
          avatar:       p.avatar,
          avatarFull:   p.avatarfull,
          personaState: p.personastate,
          gameExtraInfo: p.gameextrainfo,
          gameId:       p.gameid,
          lastLogoff:   p.lastlogoff,
        }
      },
    }),

    /*
      imgLogoUrl: Steam давно перестал отдавать поле img_logo_url в ответах
      GetOwnedGames/GetRecentlyPlayedGames — раньше здесь подставлялся
      undefined и картинка не грузилась (404 на ".../undefined.jpg").
      CDN-путь capsule_184x69.jpg собирается по одному appid, без хеша,
      и всегда доступен.
    */
    // Последние 3 сыгранные игры
    getRecentGames: builder.query<SteamGame[], string>({
      query: (steamId) =>
        `/IPlayerService/GetRecentlyPlayedGames/v1/?key=${KEY}&steamid=${steamId}&count=3`,
      transformResponse: (raw: any): SteamGame[] =>
        (raw.response.games ?? []).map((g: any) => ({
          appId:          g.appid,
          name:           g.name,
          imgIconUrl:     `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`,
          imgLogoUrl:     `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`,
          playtimeForever: g.playtime_forever,
          playtime2Weeks: g.playtime_2weeks,
          lastPlayed:     g.rtime_last_played,
        })),
    }),

    /*
      Вся библиотека игрока, отсортированная по времени по убыванию.
      Раньше здесь резался топ-4 (getFavoriteGames) — из-за этого счётчик
      "игр в библиотеке" в SteamStats показывал 4 вместо реального размера
      библиотеки. Теперь отдаём всё целиком, а топ/выбор — уже на клиенте
      (см. useFavoriteGames в hooks/useSteam.ts).
    */
    getOwnedGames: builder.query<SteamGame[], string>({
      query: (steamId) =>
        `/IPlayerService/GetOwnedGames/v1/?key=${KEY}&steamid=${steamId}&include_appinfo=true`,
      transformResponse: (raw: any): SteamGame[] =>
        (raw.response.games ?? [])
          .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
          .map((g: any) => ({
            appId:           g.appid,
            name:            g.name,
            imgIconUrl:      `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`,
            imgLogoUrl:      `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/capsule_184x69.jpg`,
            playtimeForever: g.playtime_forever,
            lastPlayed:      g.rtime_last_played,
          })),
    }),

    /*
      Список желаемого. Официального метода нет в документации Valve,
      но IWishlistService/GetWishlist давно используется сторонними
      сайтами (SteamDB и т.п.) и не требует ключа — отдаёт то же самое,
      что видно на странице wishlist в профиле. Ключ передаём как и
      везде, для единообразия и на случай будущих ограничений по rate-limit.
    */
    getWishlistCount: builder.query<number, string>({
      query: (steamId) =>
        `/IWishlistService/GetWishlist/v1/?key=${KEY}&steamid=${steamId}`,
      transformResponse: (raw: any): number => (raw.response?.items ?? []).length,
    }),

    /*
      Резолвинг логина/vanity-URL (steamcommunity.com/id/<это>) в SteamID64.
      Нужен потому что настройки профиля принимают логин, а все остальные
      методы API работают только с числовым SteamID64.
    */
    resolveVanityUrl: builder.query<string, string>({
      query: (vanityUrl) =>
        `/ISteamUser/ResolveVanityURL/v1/?key=${KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`,
      transformResponse: (raw: any): string => {
        if (raw.response.success !== 1) {
          throw new Error('Профиль не найден — проверь логин Steam')
        }
        return raw.response.steamid
      },
    }),

    /*
      Достижения по списку игр (используется для недавно сыгранных —
      см. useRecentGamesAchievements). Эндпоинт Steam принимает только
      один appid за раз, общего метода "достижения по всем играм" нет.
      Поэтому здесь не обычный query, а queryFn: на каждую игру делаем
      два запроса — GetPlayerAchievements (что получено) и
      GetSchemaForGame (иконки достижений, привязаны к apiname, а не
      к игроку) — и склеиваем. Игры без статистики или с закрытой
      приватностью просто пропускаем, а не падаем всем списком.
    */
    getGamesAchievements: builder.query<
      GameAchievementSummary[],
      { steamId: string; games: { appId: number; name: string }[] }
    >({
      queryFn: async ({ steamId, games }, _api, _extraOptions, baseQuery) => {
        const results = await Promise.all(
          games.map(async (g) => {
            const [achRes, schemaRes] = await Promise.all([
              baseQuery(`/ISteamUserStats/GetPlayerAchievements/v0001/?key=${KEY}&steamid=${steamId}&appid=${g.appId}`),
              baseQuery(`/ISteamUserStats/GetSchemaForGame/v2/?key=${KEY}&appid=${g.appId}`),
            ])
            if (achRes.error) return null
            const list = (achRes.data as any)?.playerstats?.achievements
            if (!Array.isArray(list) || list.length === 0) return null

            const schemaList = (schemaRes.data as any)?.game?.availableGameStats?.achievements ?? []
            const iconByApiName = new Map<string, string>(
              schemaList.map((s: any) => [s.name, s.icon])
            )

            const achievedSorted = list
              .filter((a: any) => a.achieved === 1)
              .sort((a: any, b: any) => (b.unlocktime ?? 0) - (a.unlocktime ?? 0))

            const unlockedIcons = achievedSorted
              .map((a: any) => iconByApiName.get(a.apiname))
              .filter((url: string | undefined): url is string => Boolean(url))
              .slice(0, MAX_ACHIEVEMENT_ICONS)

            return {
              appId: g.appId,
              gameName: g.name,
              achieved: achievedSorted.length,
              total: list.length,
              unlockedIcons,
            }
          })
        )
        return { data: results.filter((r): r is GameAchievementSummary => r !== null) }
      },
    }),

  }),
})

export const {
  useGetSteamPlayerQuery,
  useGetRecentGamesQuery,
  useGetOwnedGamesQuery,
  useGetWishlistCountQuery,
  useResolveVanityUrlQuery,
  useLazyResolveVanityUrlQuery,
  useGetGamesAchievementsQuery,
} = steamApi
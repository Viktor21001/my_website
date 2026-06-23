import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { SteamPlayer, SteamGame } from '../../types/steam'

/*
  baseUrl: '/steam-api' — запросы идут через Vite proxy.
  Proxy перенаправляет их на api.steampowered.com.
  Это обходит блокировку CORS в браузере.
  
  Ключ берём из .env файла.
  НИКОГДА не коммитим .env в Git — ключ утечёт!
*/
const KEY = import.meta.env.VITE_STEAM_API_KEY as string

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

    // Последние 3 сыгранные игры
    getRecentGames: builder.query<SteamGame[], string>({
      query: (steamId) =>
        `/IPlayerService/GetRecentlyPlayedGames/v1/?key=${KEY}&steamid=${steamId}&count=3`,
      transformResponse: (raw: any): SteamGame[] =>
        (raw.response.games ?? []).map((g: any) => ({
          appId:          g.appid,
          name:           g.name,
          imgIconUrl:     `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`,
          imgLogoUrl:     `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_logo_url}.jpg`,
          playtimeForever: g.playtime_forever,
          playtime2Weeks: g.playtime_2weeks,
          lastPlayed:     g.rtime_last_played,
        })),
    }),

    // Топ-4 игры по суммарному времени — для блока "Любимые игры"
    getFavoriteGames: builder.query<SteamGame[], string>({
      query: (steamId) =>
        `/IPlayerService/GetOwnedGames/v1/?key=${KEY}&steamid=${steamId}&include_appinfo=true`,
      transformResponse: (raw: any): SteamGame[] =>
        (raw.response.games ?? [])
          .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
          .slice(0, 4)
          .map((g: any) => ({
            appId:           g.appid,
            name:            g.name,
            imgIconUrl:      `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`,
            imgLogoUrl:      `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_logo_url}.jpg`,
            playtimeForever: g.playtime_forever,
          })),
    }),

  }),
})

export const {
  useGetSteamPlayerQuery,
  useGetRecentGamesQuery,
  useGetFavoriteGamesQuery,
} = steamApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../index'
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../types/auth'
import type {
  AgeGroup,
  BodyMeasurement,
  Exercise,
  InBodyResult,
  LeaderboardEntry,
  NewBodyMeasurement,
  NewExercise,
  NewInBodyResult,
  NewWorkout,
  UpdateExercisePayload,
  Workout,
} from '../../types/fitness'
import type { SteamGameAchievementsCache } from '../../types/steam'
import type { AdminUsersPage, AuditLogPage, BanPayload } from '../../types/admin'
import type {
  FriendRequestDirection,
  FriendRequestsPage,
  FriendsPage,
  SendFriendRequestPayload,
} from '../../types/friends'
import type { BlocksPage } from '../../types/blocks'
import type {
  ConversationsPage,
  MessageEntry,
  MessagesPage,
  StartDirectConversationResult,
} from '../../types/chat'
import type {
  CreateGroupPayload,
  GroupCommentEntry,
  GroupCommentsPage,
  GroupDetail,
  GroupJoinRequestEntry,
  GroupMembersPage,
  GroupPostEntry,
  GroupPostsPage,
  GroupsPage,
  UpdateGroupPayload,
} from '../../types/groups'
import type { SearchResults } from '../../types/search'
import type { FileReportPayload, ReportEntry, ReportsPage, ResolveReportPayload } from '../../types/reports'
import type { NotificationsPage } from '../../types/notifications'
import { getSocket } from '../../lib/socket'

/*
  baseUrl — свой Express-сервер (папка Сервер\), а не внешний API,
  поэтому (в отличие от githubApi/steamApi) прокидываем токен
  через prepareHeaders вместо ключа в query-строке.
*/
export const backendApi = createApi({
  reducerPath: 'backendApi',

  baseQuery: fetchBaseQuery({
    baseUrl: (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://127.0.0.1:4000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),

  tagTypes: [
    'Measurements', 'InBody', 'Workouts', 'Exercises', 'Leaderboard', 'SteamAchievements', 'AdminUsers',
    'Friends', 'FriendRequests', 'Blocks', 'Conversations', 'Messages',
    'Groups', 'GroupPosts', 'Notifications',
  ],

  endpoints: (builder) => ({

    register: builder.mutation<AuthResponse, RegisterPayload>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: (raw: { user: AuthUser }) => raw.user,
    }),

    updateProfile: builder.mutation<AuthUser, UpdateProfilePayload>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
    }),

    changePassword: builder.mutation<{ ok: boolean }, ChangePasswordPayload>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),

    getMeasurements: builder.query<BodyMeasurement[], void>({
      query: () => '/measurements',
      providesTags: ['Measurements'],
    }),
    addMeasurement: builder.mutation<BodyMeasurement, NewBodyMeasurement>({
      query: (body) => ({ url: '/measurements', method: 'POST', body }),
      invalidatesTags: ['Measurements'],
    }),

    getInBodyResults: builder.query<InBodyResult[], void>({
      query: () => '/inbody',
      providesTags: ['InBody'],
    }),
    addInBodyResult: builder.mutation<InBodyResult, NewInBodyResult>({
      query: (body) => ({ url: '/inbody', method: 'POST', body }),
      invalidatesTags: ['InBody'],
    }),

    getWorkouts: builder.query<Workout[], void>({
      query: () => '/workouts',
      providesTags: ['Workouts'],
    }),
    addWorkout: builder.mutation<Workout, NewWorkout>({
      query: (body) => ({ url: '/workouts', method: 'POST', body }),
      invalidatesTags: ['Workouts'],
    }),

    getExercises: builder.query<Exercise[], void>({
      query: () => '/exercises',
      providesTags: ['Exercises'],
    }),
    addExercise: builder.mutation<Exercise, NewExercise>({
      query: (body) => ({ url: '/exercises', method: 'POST', body }),
      invalidatesTags: ['Exercises'],
    }),
    updateExercise: builder.mutation<Exercise, { id: string } & UpdateExercisePayload>({
      query: ({ id, ...body }) => ({ url: `/exercises/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Exercises'],
    }),
    deleteExercise: builder.mutation<void, string>({
      query: (id) => ({ url: `/exercises/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Exercises'],
    }),

    getLeaderboard: builder.query<LeaderboardEntry[], AgeGroup>({
      query: (ageGroup) => `/leaderboard?ageGroup=${ageGroup}`,
      providesTags: ['Leaderboard'],
    }),

    /*
      Кэш достижений по всей Steam-библиотеке — читает уже готовые данные
      из БД (см. Сервер/src/routes/steamAchievements.ts), никаких запросов
      к Steam при каждой загрузке страницы.

      startSteamAchievementsSync запускает синхронизацию в фоне на сервере
      и отвечает сразу же (total игр, статус running) — сама синхронизация
      может занимать десятки секунд-минуты на большую библиотеку, поэтому
      её прогресс читается отдельным поллингом getSteamAchievementsSyncStatus
      (см. useAchievementsLibrary в hooks/useSteam.ts), а не одним долгим
      запросом, который держал бы вкладку "подвисшей".
    */
    getSteamAchievementsCache: builder.query<
      { games: SteamGameAchievementsCache[]; lastSyncedAt: string | null },
      void
    >({
      query: () => '/steam-achievements',
      providesTags: ['SteamAchievements'],
    }),
    startSteamAchievementsSync: builder.mutation<{ status: string; total: number }, void>({
      query: () => ({ url: '/steam-achievements/sync', method: 'POST' }),
    }),
    getSteamAchievementsSyncStatus: builder.query<
      { status: 'idle' | 'running' | 'done' | 'error'; processed: number; total: number; gamesSynced: number; error?: string },
      void
    >({
      query: () => '/steam-achievements/sync/status',
    }),

    /*
      Админ-панель — все запросы к /admin/* сервер перепроверяет по роли,
      прочитанной свежо из БД (см. Сервер/src/middleware/authenticate.ts),
      клиентские проверки роли — только чтобы не показывать лишние кнопки.
    */
    getAdminUsers: builder.query<AdminUsersPage, { q?: string; cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.q) search.set('q', params.q)
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/admin/users${qs ? `?${qs}` : ''}`
      },
      providesTags: ['AdminUsers'],
    }),
    banUser: builder.mutation<{ ok: boolean }, BanPayload>({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}/ban`, method: 'POST', body }),
      invalidatesTags: ['AdminUsers'],
    }),
    unbanUser: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/unban`, method: 'POST' }),
      invalidatesTags: ['AdminUsers'],
    }),
    resetUserPassword: builder.mutation<{ password: string }, string>({
      query: (id) => ({ url: `/admin/users/${id}/reset-password`, method: 'POST' }),
    }),
    deleteAdminUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminUsers'],
    }),
    promoteUser: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/promote`, method: 'POST' }),
      invalidatesTags: ['AdminUsers'],
    }),
    demoteUser: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/admin/users/${id}/demote`, method: 'POST' }),
      invalidatesTags: ['AdminUsers'],
    }),
    getAuditLog: builder.query<AuditLogPage, { cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/admin/audit-log${qs ? `?${qs}` : ''}`
      },
    }),

    // Очередь жалоб в админ-панели — тот же useLazyQuery+локальный refresh()
    // паттерн, что «Пользователи»/«Журнал действий» в AdminPanel
    getAdminReports: builder.query<ReportsPage, { status?: string; cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.status) search.set('status', params.status)
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/admin/reports${qs ? `?${qs}` : ''}`
      },
    }),
    resolveReport: builder.mutation<{ report: ReportEntry }, ResolveReportPayload>({
      query: ({ id, ...body }) => ({ url: `/admin/reports/${id}/resolve`, method: 'POST', body }),
    }),
    rejectReport: builder.mutation<{ report: ReportEntry }, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: `/admin/reports/${id}/reject`, method: 'POST', body: { note } }),
    }),

    getFriends: builder.query<FriendsPage, { cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/friends${qs ? `?${qs}` : ''}`
      },
      providesTags: ['Friends'],
    }),
    removeFriend: builder.mutation<{ ok: boolean }, string>({
      query: (userId) => ({ url: `/friends/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Friends'],
    }),

    getFriendRequests: builder.query<FriendRequestsPage, { direction: FriendRequestDirection; cursor?: string }>({
      query: ({ direction, cursor }) => {
        const search = new URLSearchParams({ direction })
        if (cursor) search.set('cursor', cursor)
        return `/friends/requests?${search.toString()}`
      },
      providesTags: ['FriendRequests'],
    }),
    // Обычная заявка -> invalidatesTags: ['FriendRequests']. Если получатель
    // уже успел отправить встречную заявку — сервер мгновенно склеивает её в
    // ACCEPTED (autoAccepted: true в ответе), поэтому дружим тег и с Friends
    sendFriendRequest: builder.mutation<{ autoAccepted?: boolean }, SendFriendRequestPayload>({
      query: (body) => ({ url: '/friends/requests', method: 'POST', body }),
      invalidatesTags: ['FriendRequests', 'Friends'],
    }),
    acceptFriendRequest: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/friends/requests/${id}/accept`, method: 'POST' }),
      invalidatesTags: ['FriendRequests', 'Friends'],
    }),
    declineFriendRequest: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/friends/requests/${id}/decline`, method: 'POST' }),
      invalidatesTags: ['FriendRequests'],
    }),
    cancelFriendRequest: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/friends/requests/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FriendRequests'],
    }),

    getBlocks: builder.query<BlocksPage, { cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/blocks${qs ? `?${qs}` : ''}`
      },
      providesTags: ['Blocks'],
    }),
    // Блокировка на сервере ещё и рвёт дружбу, если она была — поэтому
    // инвалидируем Friends тоже, а не только Blocks
    blockUser: builder.mutation<{ ok: boolean }, string>({
      query: (userId) => ({ url: '/blocks', method: 'POST', body: { userId } }),
      invalidatesTags: ['Blocks', 'Friends'],
    }),
    unblockUser: builder.mutation<{ ok: boolean }, string>({
      query: (userId) => ({ url: `/blocks/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Blocks'],
    }),

    /*
      Реалтайм-чат. getConversations/getMessages — реактивные useQuery (не
      Lazy), поэтому их не касается известная по AdminPanel проблема "тег-
      инвалидация не помогает локально накопленному state". onCacheEntryAdded
      подписывается на сокет-события ТОЛЬКО пока у запроса есть активный
      подписчик (открытый чат/список) и правит кэш напрямую через
      updateCachedData — штатный RTK Query паттерн для потоковых обновлений,
      не изобретение. getOlderMessages — отдельный эндпоинт специально для
      кнопки «Показать ещё» (там остаётся Lazy + локальный useState, как в
      AdminPanel) — не путать со свежей страницей getMessages.
    */
    getConversations: builder.query<ConversationsPage, void>({
      query: () => '/conversations',
      providesTags: ['Conversations'],
      async onCacheEntryAdded(_arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        try {
          await cacheDataLoaded
        } catch {
          return
        }
        const socket = getSocket()
        if (!socket) {
          await cacheEntryRemoved
          return
        }
        function onNewMessage(payload: { conversationId: string; message: MessageEntry }) {
          updateCachedData((draft) => {
            const idx = draft.conversations.findIndex((c) => c.id === payload.conversationId)
            if (idx === -1) return // переписки ещё нет в списке — проще перезапросить целиком, чем собирать вручную
            const [conv] = draft.conversations.splice(idx, 1)
            conv.lastMessage = { body: payload.message.body, createdAt: payload.message.createdAt, senderId: payload.message.senderId }
            conv.lastMessageAt = payload.message.createdAt
            conv.unreadCount += 1
            draft.conversations.unshift(conv)
          })
        }
        socket.on('message:new', onNewMessage)
        await cacheEntryRemoved
        socket.off('message:new', onNewMessage)
      },
    }),
    startDirectConversation: builder.mutation<StartDirectConversationResult, string>({
      query: (userId) => ({ url: '/conversations/direct', method: 'POST', body: { userId } }),
      invalidatesTags: ['Conversations'],
    }),

    getMessages: builder.query<MessagesPage, string>({
      query: (conversationId) => `/conversations/${conversationId}/messages`,
      providesTags: (_result, _error, conversationId) => [{ type: 'Messages', id: conversationId }],
      async onCacheEntryAdded(conversationId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        try {
          await cacheDataLoaded
        } catch {
          return
        }
        const socket = getSocket()
        if (!socket) {
          await cacheEntryRemoved
          return
        }
        function onNewMessage(payload: { conversationId: string; message: MessageEntry }) {
          if (payload.conversationId !== conversationId) return
          updateCachedData((draft) => {
            draft.messages.push(payload.message)
          })
        }
        socket.on('message:new', onNewMessage)
        await cacheEntryRemoved
        socket.off('message:new', onNewMessage)
      },
    }),
    // Только для догрузки старой истории по клику «Показать ещё» — не
    // реактивна, используется исключительно через Lazy-вариант
    getOlderMessages: builder.query<MessagesPage, { conversationId: string; cursor: string }>({
      query: ({ conversationId, cursor }) => `/conversations/${conversationId}/messages?cursor=${cursor}`,
    }),
    sendMessage: builder.mutation<{ message: MessageEntry }, { conversationId: string; body: string }>({
      query: ({ conversationId, body }) => ({ url: `/conversations/${conversationId}/messages`, method: 'POST', body: { body } }),
      invalidatesTags: (_result, _error, { conversationId }) => ['Conversations', { type: 'Messages', id: conversationId }],
    }),
    markConversationRead: builder.mutation<{ ok: boolean }, string>({
      query: (conversationId) => ({ url: `/conversations/${conversationId}/read`, method: 'POST' }),
      invalidatesTags: ['Conversations'],
    }),

    /*
      Группы. getGroups обслуживает и обзор/поиск, и «мои группы» (mine:true)
      — один эндпоинт, как и описано в плане. getGroupPosts — тот же
      onCacheEntryAdded-паттерн, что getMessages: реактивна, пока открыта
      стена, лайки/комментарии/новые записи от других участников приходят
      через сокет и правят кэш точечно, без перезапроса всей страницы.
    */
    getGroups: builder.query<GroupsPage, { q?: string; mine?: boolean; cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.q) search.set('q', params.q)
        if (params?.mine) search.set('mine', 'true')
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/groups${qs ? `?${qs}` : ''}`
      },
      providesTags: ['Groups'],
    }),
    getGroup: builder.query<{ group: GroupDetail }, string>({
      query: (id) => `/groups/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Groups', id }],
    }),
    createGroup: builder.mutation<{ group: GroupDetail }, CreateGroupPayload>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: ['Groups'],
    }),
    updateGroup: builder.mutation<{ group: GroupDetail }, { id: string } & UpdateGroupPayload>({
      query: ({ id, ...body }) => ({ url: `/groups/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Groups', id }, 'Groups'],
    }),
    deleteGroup: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/groups/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Groups'],
    }),

    getGroupMembers: builder.query<GroupMembersPage, { groupId: string; cursor?: string }>({
      query: ({ groupId, cursor }) => {
        const search = new URLSearchParams()
        if (cursor) search.set('cursor', cursor)
        const qs = search.toString()
        return `/groups/${groupId}/members${qs ? `?${qs}` : ''}`
      },
    }),
    joinGroup: builder.mutation<{ status: 'MEMBER' | 'PENDING' }, string>({
      query: (id) => ({ url: `/groups/${id}/join`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Groups', id }, 'Groups'],
    }),
    leaveGroup: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/groups/${id}/leave`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Groups', id }, 'Groups'],
    }),

    getGroupRequests: builder.query<{ requests: GroupJoinRequestEntry[] }, string>({
      query: (groupId) => `/groups/${groupId}/requests`,
    }),
    approveGroupRequest: builder.mutation<{ ok: boolean }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/requests/${userId}/approve`, method: 'POST' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, 'Groups'],
    }),
    rejectGroupRequest: builder.mutation<{ ok: boolean }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/requests/${userId}/reject`, method: 'POST' }),
    }),
    promoteGroupMember: builder.mutation<{ ok: boolean }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/members/${userId}/promote`, method: 'POST' }),
    }),
    demoteGroupMember: builder.mutation<{ ok: boolean }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/members/${userId}/demote`, method: 'POST' }),
    }),
    removeGroupMember: builder.mutation<{ ok: boolean }, { groupId: string; userId: string }>({
      query: ({ groupId, userId }) => ({ url: `/groups/${groupId}/members/${userId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'Groups', id: groupId }, 'Groups'],
    }),

    getGroupPosts: builder.query<GroupPostsPage, string>({
      query: (groupId) => `/groups/${groupId}/posts`,
      providesTags: (_result, _error, groupId) => [{ type: 'GroupPosts', id: groupId }],
      async onCacheEntryAdded(groupId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        try {
          await cacheDataLoaded
        } catch {
          return
        }
        const socket = getSocket()
        if (!socket) {
          await cacheEntryRemoved
          return
        }
        function onNew(payload: { groupId: string; post: GroupPostEntry }) {
          if (payload.groupId !== groupId) return
          updateCachedData((draft) => {
            draft.posts.unshift(payload.post)
          })
        }
        function onDeleted(payload: { groupId: string; postId: string }) {
          if (payload.groupId !== groupId) return
          updateCachedData((draft) => {
            draft.posts = draft.posts.filter((p) => p.id !== payload.postId)
          })
        }
        function onLike(payload: { groupId: string; postId: string }) {
          if (payload.groupId !== groupId) return
          updateCachedData((draft) => {
            const post = draft.posts.find((p) => p.id === payload.postId)
            if (post) post.likeCount += 1
          })
        }
        function onComment(payload: { groupId: string; postId: string }) {
          if (payload.groupId !== groupId) return
          updateCachedData((draft) => {
            const post = draft.posts.find((p) => p.id === payload.postId)
            if (post) post.commentCount += 1
          })
        }
        socket.on('groupPost:new', onNew)
        socket.on('groupPost:deleted', onDeleted)
        socket.on('groupPost:like', onLike)
        socket.on('groupPost:comment', onComment)
        await cacheEntryRemoved
        socket.off('groupPost:new', onNew)
        socket.off('groupPost:deleted', onDeleted)
        socket.off('groupPost:like', onLike)
        socket.off('groupPost:comment', onComment)
      },
    }),
    // Только для догрузки старых записей кнопкой «Показать ещё» — не реактивна
    getOlderGroupPosts: builder.query<GroupPostsPage, { groupId: string; cursor: string }>({
      query: ({ groupId, cursor }) => `/groups/${groupId}/posts?cursor=${cursor}`,
    }),
    createGroupPost: builder.mutation<{ post: GroupPostEntry }, { groupId: string; body: string }>({
      query: ({ groupId, body }) => ({ url: `/groups/${groupId}/posts`, method: 'POST', body: { body } }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),
    deleteGroupPost: builder.mutation<{ ok: boolean }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({ url: `/groups/${groupId}/posts/${postId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),
    likeGroupPost: builder.mutation<{ ok: boolean }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({ url: `/groups/${groupId}/posts/${postId}/like`, method: 'POST' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),
    unlikeGroupPost: builder.mutation<{ ok: boolean }, { groupId: string; postId: string }>({
      query: ({ groupId, postId }) => ({ url: `/groups/${groupId}/posts/${postId}/like`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),

    getGroupComments: builder.query<GroupCommentsPage, { groupId: string; postId: string; cursor?: string }>({
      query: ({ groupId, postId, cursor }) => {
        const search = new URLSearchParams()
        if (cursor) search.set('cursor', cursor)
        const qs = search.toString()
        return `/groups/${groupId}/posts/${postId}/comments${qs ? `?${qs}` : ''}`
      },
    }),
    createGroupComment: builder.mutation<{ comment: GroupCommentEntry }, { groupId: string; postId: string; body: string }>({
      query: ({ groupId, postId, body }) => ({ url: `/groups/${groupId}/posts/${postId}/comments`, method: 'POST', body: { body } }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),
    deleteGroupComment: builder.mutation<{ ok: boolean }, { groupId: string; postId: string; commentId: string }>({
      query: ({ groupId, postId, commentId }) => ({ url: `/groups/${groupId}/posts/${postId}/comments/${commentId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { groupId }) => [{ type: 'GroupPosts', id: groupId }],
    }),

    // Поиск — People + Group разом. Не реактивна: дебаунс + локальный state
    // на клиенте (тот же паттерн, что GroupsTab/FriendsTab), а не кэш RTK Query
    getSearch: builder.query<SearchResults, { q: string; usersCursor?: string; groupsCursor?: string }>({
      query: ({ q, usersCursor, groupsCursor }) => {
        const search = new URLSearchParams({ q })
        if (usersCursor) search.set('usersCursor', usersCursor)
        if (groupsCursor) search.set('groupsCursor', groupsCursor)
        return `/search?${search.toString()}`
      },
    }),

    fileReport: builder.mutation<{ report: ReportEntry }, FileReportPayload>({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
    }),
    getMyReports: builder.query<ReportsPage, { cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/reports/mine${qs ? `?${qs}` : ''}`
      },
    }),

    /*
      Колокольчик уведомлений. getUnreadNotificationCount — реактивна
      (бейдж в шапке), инвалидируется по сокет-событию notification:new
      (см. useSocket.ts) — отдельного поллинга не заводим.
    */
    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notifications'],
    }),
    getNotifications: builder.query<NotificationsPage, { cursor?: string } | void>({
      query: (params) => {
        const search = new URLSearchParams()
        if (params?.cursor) search.set('cursor', params.cursor)
        const qs = search.toString()
        return `/notifications${qs ? `?${qs}` : ''}`
      },
    }),
    markNotificationRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notifications'],
    }),

  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetMeasurementsQuery,
  useAddMeasurementMutation,
  useGetInBodyResultsQuery,
  useAddInBodyResultMutation,
  useGetWorkoutsQuery,
  useAddWorkoutMutation,
  useGetExercisesQuery,
  useAddExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
  useGetLeaderboardQuery,
  useGetSteamAchievementsCacheQuery,
  useStartSteamAchievementsSyncMutation,
  useLazyGetSteamAchievementsSyncStatusQuery,
  useGetAdminUsersQuery,
  useLazyGetAdminUsersQuery,
  useBanUserMutation,
  useUnbanUserMutation,
  useResetUserPasswordMutation,
  useDeleteAdminUserMutation,
  usePromoteUserMutation,
  useDemoteUserMutation,
  useGetAuditLogQuery,
  useLazyGetAuditLogQuery,
  useGetFriendsQuery,
  useLazyGetFriendsQuery,
  useRemoveFriendMutation,
  useGetFriendRequestsQuery,
  useLazyGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useCancelFriendRequestMutation,
  useGetBlocksQuery,
  useLazyGetBlocksQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetConversationsQuery,
  useStartDirectConversationMutation,
  useGetMessagesQuery,
  useLazyGetOlderMessagesQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useGetGroupsQuery,
  useLazyGetGroupsQuery,
  useGetGroupQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useLazyGetGroupMembersQuery,
  useJoinGroupMutation,
  useLeaveGroupMutation,
  useLazyGetGroupRequestsQuery,
  useApproveGroupRequestMutation,
  useRejectGroupRequestMutation,
  usePromoteGroupMemberMutation,
  useDemoteGroupMemberMutation,
  useRemoveGroupMemberMutation,
  useGetGroupPostsQuery,
  useLazyGetOlderGroupPostsQuery,
  useCreateGroupPostMutation,
  useDeleteGroupPostMutation,
  useLikeGroupPostMutation,
  useUnlikeGroupPostMutation,
  useLazyGetGroupCommentsQuery,
  useCreateGroupCommentMutation,
  useDeleteGroupCommentMutation,
  useLazyGetSearchQuery,
  useLazyGetAdminReportsQuery,
  useResolveReportMutation,
  useRejectReportMutation,
  useFileReportMutation,
  useLazyGetMyReportsQuery,
  useGetUnreadNotificationCountQuery,
  useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = backendApi

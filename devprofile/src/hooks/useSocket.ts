import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from './redux'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { backendApi } from '../store/api/backendApi'

/*
  Открывает сокет-соединение, пока есть токен (закрывает при logout) —
  вызывается один раз в App.tsx, тем же принципом, что useSyncAuthUser.
  message:new/presence:* для конкретных открытых запросов (переписка,
  список переписок) обрабатываются точечно через onCacheEntryAdded в
  backendApi.ts — здесь только события, которые ничего точечного не
  подписывают, и которым проще просто перезапросить свои теги.
*/
export function useSocket() {
  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!token) {
      disconnectSocket()
      return
    }

    const socket = connectSocket(token)

    function onFriendRequestNew() {
      dispatch(backendApi.util.invalidateTags(['FriendRequests']))
    }
    function onFriendRequestAccepted() {
      dispatch(backendApi.util.invalidateTags(['FriendRequests', 'Friends']))
    }
    // Заявка/одобрение вступления в группу — троллится через тот же общий
    // тег 'Groups' (без id): у getGroupRequests/getGroupMembers своя lazy-
    // подписка без providesTags (как и в admin.ts-подобных списках), но
    // getGroup(id)/getGroups список membership-статуса реагируют на этот тег
    function onGroupJoinRequestChange() {
      dispatch(backendApi.util.invalidateTags(['Groups']))
    }
    // Колокольчик — бейдж непрочитанного реагирует на тег, сам список
    // подгружается по клику (см. NotificationBell), не реактивной подпиской
    function onNotificationNew() {
      dispatch(backendApi.util.invalidateTags(['Notifications']))
    }

    socket.on('friendRequest:new', onFriendRequestNew)
    socket.on('friendRequest:accepted', onFriendRequestAccepted)
    socket.on('groupJoinRequest:new', onGroupJoinRequestChange)
    socket.on('groupJoinRequest:approved', onGroupJoinRequestChange)
    socket.on('notification:new', onNotificationNew)

    return () => {
      socket.off('friendRequest:new', onFriendRequestNew)
      socket.off('friendRequest:accepted', onFriendRequestAccepted)
      socket.off('groupJoinRequest:new', onGroupJoinRequestChange)
      socket.off('groupJoinRequest:approved', onGroupJoinRequestChange)
      socket.off('notification:new', onNotificationNew)
    }
  }, [token, dispatch])
}

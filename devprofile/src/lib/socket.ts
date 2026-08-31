import { io, type Socket } from 'socket.io-client'

let socket: Socket | undefined

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? 'http://127.0.0.1:4000/api'
// Socket.IO висит на корневом HTTP-сервере, а не под /api — тот же сервер,
// что и REST (см. Сервер/src/index.ts), просто без префикса роутера
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '')

/*
  Модуль-синглтон, не хук — так к нему может обратиться onCacheEntryAdded в
  backendApi.ts (живёт вне React) точно так же, как хук useSocket.ts
  (управляет подключением по токену из Redux, вызывается один раз в App.tsx).
*/
export function connectSocket(token: string): Socket {
  if (socket?.connected && (socket.auth as { token?: string } | undefined)?.token === token) return socket
  socket?.disconnect()
  socket = io(SOCKET_URL, { auth: { token } })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = undefined
}

export function getSocket(): Socket | undefined {
  return socket
}

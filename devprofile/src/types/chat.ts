import type { PublicUser } from './social'

export type ConversationType = 'DIRECT' | 'GROUP'

export interface MessageEntry {
  id: string
  conversationId: string
  senderId: string | null
  senderUsername: string
  body: string
  createdAt: string
}

export interface MessagesPage {
  messages: MessageEntry[]
  nextCursor: string | null
}

export interface ConversationLastMessage {
  body: string
  createdAt: string
  senderId: string | null
}

export interface ConversationEntry {
  id: string
  type: ConversationType
  // null только для будущих групповых переписок (Фаза 4) — у DIRECT всегда есть
  otherUser: PublicUser | null
  // Начальное значение с сервера — дальше клиент сам следит за presence:update
  otherUserOnline: boolean
  lastMessage: ConversationLastMessage | null
  lastMessageAt: string
  unreadCount: number
}

export interface ConversationsPage {
  conversations: ConversationEntry[]
  nextCursor: string | null
}

export interface StartDirectConversationResult {
  conversation: { id: string; type: ConversationType }
}

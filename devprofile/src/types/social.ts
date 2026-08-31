// Общая "карточка" другого пользователя — переиспользуется во всех
// подсистемах соцслоя (друзья, чёрный список, дальше — группы, поиск)
export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatar: string | null
}

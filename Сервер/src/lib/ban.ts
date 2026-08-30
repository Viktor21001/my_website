/*
  ban.ts — общая логика бана, используется и в authenticate (проверка на
  каждый запрос уже залогиненной сессии) и в auth.ts (проверка при входе).

  Бан временный или постоянный хранится без отдельного флага: bannedAt
  задан всегда, пока бан активен; bannedUntil = null — бан постоянный,
  иначе сравнивается с текущим временем лениво здесь же — отдельного
  крона на снятие просроченного бана нет, поле само перестаёт считаться
  активным, как только now() перевалило за bannedUntil.
*/

interface BanFields {
  bannedAt: Date | null
  bannedUntil: Date | null
  banReason: string | null
}

export function isCurrentlyBanned(user: BanFields): boolean {
  if (!user.bannedAt) return false
  if (!user.bannedUntil) return true // постоянный бан
  return user.bannedUntil.getTime() > Date.now()
}

export function formatBanMessage(user: BanFields): string {
  const reason = user.banReason ? `: ${user.banReason}` : ''
  if (!user.bannedUntil) {
    return `Аккаунт заблокирован навсегда${reason}`
  }
  const until = user.bannedUntil.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `Аккаунт заблокирован до ${until}${reason}`
}

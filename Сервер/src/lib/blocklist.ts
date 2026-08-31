import { prisma } from './prisma'

// Блокировка симметрична по эффекту — не важно, кто кого заблокировал,
// проверяем обе строки одним запросом
export async function areBlocked(userIdA: string, userIdB: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  })
  return block !== null
}

// Для списков (поиск) — все id, заблокированные в любую сторону разом,
// а не проверка одной конкретной пары
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  })
  const ids = new Set<string>()
  for (const r of rows) ids.add(r.blockerId === userId ? r.blockedId : r.blockerId)
  return [...ids]
}

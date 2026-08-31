import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { publicUserSelect } from '../lib/publicUser'
import { getBlockedUserIds } from '../lib/blocklist'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 8) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 50)
}

/*
  GET /search?q=&usersCursor=&groupsCursor= — единый эндпоинт для People +
  Groups разом (Упражнения намеренно не включены — у каталога упражнений
  уже есть свой поиск/вкладки внутри библиотеки, см. план). Пустой q не
  бьёт по БД зря — короткий early return.
*/
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

    if (!q) {
      res.json({ users: [], usersNextCursor: null, groups: [], groupsNextCursor: null })
      return
    }

    const usersCursor = typeof req.query.usersCursor === 'string' ? req.query.usersCursor : undefined
    const groupsCursor = typeof req.query.groupsCursor === 'string' ? req.query.groupsCursor : undefined
    const limit = clampLimit(req.query.limit)

    const blockedIds = await getBlockedUserIds(userId)

    const userRows = await prisma.user.findMany({
      where: {
        bannedAt: null,
        id: { notIn: [userId, ...blockedIds] },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: publicUserSelect,
      orderBy: { username: 'asc' },
      take: limit + 1,
      ...(usersCursor ? { cursor: { id: usersCursor }, skip: 1 } : {}),
    })
    const usersHasMore = userRows.length > limit
    const usersPage = usersHasMore ? userRows.slice(0, limit) : userRows

    const groupRows = await prisma.group.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { members: { where: { userId }, select: { role: true, status: true } } },
      orderBy: { name: 'asc' },
      take: limit + 1,
      ...(groupsCursor ? { cursor: { id: groupsCursor }, skip: 1 } : {}),
    })
    const groupsHasMore = groupRows.length > limit
    const groupsPage = groupsHasMore ? groupRows.slice(0, limit) : groupRows
    const groups = await Promise.all(
      groupsPage.map(async (g) => {
        const memberCount = await prisma.groupMember.count({ where: { groupId: g.id, status: 'MEMBER' } })
        const mine = g.members[0]
        return {
          id: g.id, name: g.name, slug: g.slug, description: g.description, avatar: g.avatar,
          privacy: g.privacy, memberCount, myRole: mine?.role ?? null, myStatus: mine?.status ?? null,
        }
      })
    )

    res.json({
      users: usersPage,
      usersNextCursor: usersHasMore ? usersPage[usersPage.length - 1].id : null,
      groups,
      groupsNextCursor: groupsHasMore ? groupsPage[groupsPage.length - 1].id : null,
    })
  })
)

export default router

import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import measurementsRouter from './routes/measurements'
import inbodyRouter from './routes/inbody'
import workoutsRouter from './routes/workouts'
import exercisesRouter from './routes/exercises'
import leaderboardRouter from './routes/leaderboard'
import usersRouter from './routes/users'
import steamAchievementsRouter from './routes/steamAchievements'
import adminRouter from './routes/admin'
import friendsRouter from './routes/friends'
import blocksRouter from './routes/blocks'
import conversationsRouter from './routes/conversations'
import groupsRouter from './routes/groups'
import searchRouter from './routes/search'
import reportsRouter from './routes/reports'
import notificationsRouter from './routes/notifications'
import { errorHandler } from './middleware/errorHandler'
import { initSocket } from './lib/socket'

const app = express()

/*
  Vite при занятом порте молча переезжает на следующий (5173 -> 5174 -> ...),
  поэтому сверяться с одним фиксированным CLIENT_ORIGIN из .env ненадёжно
  в деве — легко словить "мёртвую" CORS-ошибку без внятного сообщения.
  В деве разрешаем любой порт на localhost/127.0.0.1; в проде (если задан
  CLIENT_ORIGIN и NODE_ENV=production) — только его.
*/
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true) // curl/сервер-сервер запросы без Origin
      if (process.env.NODE_ENV === 'production') {
        return callback(null, origin === process.env.CLIENT_ORIGIN)
      }
      callback(null, LOCALHOST_ORIGIN.test(origin))
    },
  })
)
// Аватар/фон приходят как base64 data URL — дефолтный лимит express.json (100kb) мал для картинок
app.use(express.json({ limit: '6mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/measurements', measurementsRouter)
app.use('/api/inbody', inbodyRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/exercises', exercisesRouter)
app.use('/api/leaderboard', leaderboardRouter)
app.use('/api/users', usersRouter)
app.use('/api/steam-achievements', steamAchievementsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/friends', friendsRouter)
app.use('/api/blocks', blocksRouter)
app.use('/api/conversations', conversationsRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/search', searchRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/notifications', notificationsRouter)

// Последним — errorHandler ловит всё, что бросили asyncHandler-обёртки
app.use(errorHandler)

// http.createServer(app), а не app.listen напрямую — Socket.IO вешается на
// тот же HTTP-сервер (второй порт под сокет никому не нужен)
const server = createServer(app)
initSocket(server)

const PORT = process.env.PORT ?? 4000
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://127.0.0.1:${PORT}`)
})

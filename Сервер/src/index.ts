import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import measurementsRouter from './routes/measurements'
import inbodyRouter from './routes/inbody'
import workoutsRouter from './routes/workouts'
import exercisesRouter from './routes/exercises'
import leaderboardRouter from './routes/leaderboard'
import { errorHandler } from './middleware/errorHandler'

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
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/measurements', measurementsRouter)
app.use('/api/inbody', inbodyRouter)
app.use('/api/workouts', workoutsRouter)
app.use('/api/exercises', exercisesRouter)
app.use('/api/leaderboard', leaderboardRouter)

// Последним — errorHandler ловит всё, что бросили asyncHandler-обёртки
app.use(errorHandler)

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://127.0.0.1:${PORT}`)
})

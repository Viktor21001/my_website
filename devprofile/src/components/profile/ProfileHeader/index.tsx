/*
  ProfileHeader — шапка профиля.
  Адаптив: на мобильном стекируется вертикально.
*/

import { motion } from 'framer-motion'
import { useAppSelector } from '../../../hooks/redux'
import { xpProgressPercent } from '../../../config/constants'
import { fadeUpVariants } from '../../../hooks/useAnimatedMount'
import { Avatar } from '../../shared/Avatar'

export function ProfileHeader() {
  const user = useAppSelector((state) => state.auth.user)
  const { level, xp, status } = useAppSelector((state) => state.profile)

  if (!user) return null

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(79,163,212,0.06) 0%, transparent 100%)',
        borderBottom: '1px solid var(--dp-border)',
      }}
    >
      {/* Верхняя светящаяся линия */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--dp-accent-dim), transparent)',
        }}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 sm:p-5">

        {/* Аватар */}
        <motion.div
          className="relative shrink-0"
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          <Avatar
            src={user.avatar}
            name={user.displayName}
            size={84}
            borderWidth={2}
            borderColor="var(--dp-border-light)"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
          />

          {/* Статус-точка */}
          <StatusDot status={status} />
        </motion.div>

        {/* Основная информация */}
        <motion.div
          className="flex-1 min-w-0 pb-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="text-xl sm:text-2xl font-bold leading-tight truncate"
            style={{ color: 'var(--dp-text-white)', letterSpacing: '-0.01em' }}
          >
            {user.displayName}
          </h1>

          {/* Username в моно-стиле */}
          <div
            className="text-xs mt-0.5 font-mono"
            style={{ color: 'var(--dp-text-code)' }}
          >
            @{user.username}
          </div>

          {user.location && (
            <div
              className="text-xs mt-1.5 flex items-center gap-1.5"
              style={{ color: 'var(--dp-text-secondary)' }}
            >
              <span style={{ fontSize: 10 }}>📍</span>
              <span>{user.location}</span>
            </div>
          )}

          {user.bio && (
            <p
              className="text-xs mt-1.5 leading-relaxed line-clamp-2"
              style={{ color: 'var(--dp-text-secondary)', maxWidth: 420 }}
            >
              {user.bio}
            </p>
          )}

          {/* Соцсети */}
          <div className="flex flex-wrap gap-3 mt-2.5">
            {user.githubUsername && (
              <SocialLink
                href={`https://github.com/${user.githubUsername}`}
                icon="⌥"
                label="GitHub"
              />
            )}
            {user.steamId && (
              <SocialLink
                href={`https://steamcommunity.com/profiles/${user.steamId}`}
                icon="◈"
                label="Steam"
              />
            )}
          </div>
        </motion.div>

        {/* Уровень + XP — прячем на очень маленьких экранах */}
        <motion.div
          className="hidden sm:flex flex-col items-end gap-2 pb-1 shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {/* Уровень */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              Уровень
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--dp-accent-dim), var(--dp-accent))',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(79,163,212,0.4)',
              }}
            >
              {level}
            </div>
          </div>

          {/* XP прогресс */}
          <div style={{ width: 130 }}>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--dp-border)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--dp-accent-dim), var(--dp-accent-bright))',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${xpProgressPercent(xp)}%` }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div
              className="text-xs mt-1 text-right font-mono"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              {xp % 100} / 100 XP
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online:    'var(--dp-status-online)',
    coding:    'var(--dp-status-coding)',
    'in-game': 'var(--dp-status-ingame)',
    offline:   'var(--dp-status-offline)',
  }
  const isActive = status !== 'offline'

  return (
    <div
      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2"
      style={{
        background:  colors[status] ?? colors.offline,
        borderColor: 'var(--dp-bg-page)',
      }}
    >
      {/* Пульсация только для активных статусов */}
      {isActive && (
        <div
          className="absolute inset-0 rounded-full dp-status-pulse"
          style={{ background: colors[status] ?? colors.offline, opacity: 0.4 }}
        />
      )}
    </div>
  )
}

function SocialLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 text-xs transition-all duration-150"
      style={{ color: 'var(--dp-text-secondary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--dp-accent-bright)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--dp-text-secondary)'
      }}
    >
      <span style={{ fontFamily: 'monospace' }}>{icon}</span>
      <span>{label}</span>
    </a>
  )
}
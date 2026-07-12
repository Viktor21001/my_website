import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'

interface ComingSoonProps {
  title: string
  icon?: string
}

export function ComingSoon({ title, icon = '🔧' }: ComingSoonProps) {
  return (
    <motion.div
      className="dp-panel overflow-hidden"
      variants={staggerItemVariants}
    >
      <div className="dp-section-title">{title}</div>
      <div
        className="p-4 flex flex-col items-center gap-2 text-center"
        style={{ minHeight: 80 }}
      >
        <span className="text-2xl opacity-40">{icon}</span>
        <span className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
          В разработке
        </span>
      </div>
    </motion.div>
  )
}
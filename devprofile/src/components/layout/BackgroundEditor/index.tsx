import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setBackground } from '../../../store/slices/profileSlice'
import { setBackgroundEditorOpen } from '../../../store/slices/uiSlice'
import { BACKGROUND_PRESETS } from '../../../config/constants'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'

export function BackgroundEditor() {
  const dispatch   = useAppDispatch()
  const isOpen     = useAppSelector((state) => state.ui.isBackgroundEditorOpen)
  const background = useAppSelector((state) => state.profile.user.background)
  const fileRef    = useRef<HTMLInputElement>(null)

  function close() { dispatch(setBackgroundEditorOpen(false)) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      dispatch(setBackground({ ...background, type: 'image', url }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Панель */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 overflow-y-auto"
            style={{
              background:  'var(--dp-bg-panel)',
              borderTop:   '1px solid var(--dp-border-accent)',
              boxShadow:   '0 -8px 32px rgba(0,0,0,0.7)',
              maxHeight:   '85vh',
              borderRadius: '12px 12px 0 0',
            }}
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Ручка */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'var(--dp-border-light)' }}
              />
            </div>

            {/* Шапка */}
            <div
              className="flex items-center justify-between px-5 py-3 sticky top-0"
              style={{
                background:   'var(--dp-bg-panel)',
                borderBottom: '1px solid var(--dp-border)',
              }}
            >
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: 'var(--dp-text-white)' }}
                >
                  Настройка фона
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--dp-text-muted)' }}
                >
                  Сохраняется автоматически
                </div>
              </div>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150"
                style={{
                  background: 'var(--dp-bg-card)',
                  border:     '1px solid var(--dp-border)',
                  color:      'var(--dp-text-secondary)',
                  cursor:     'pointer',
                  fontSize:   16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color       = 'var(--dp-text-white)'
                  e.currentTarget.style.borderColor = 'var(--dp-border-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color       = 'var(--dp-text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--dp-border)'
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6">

              {/* Пресеты */}
              <section>
                <div className="dp-section-title" style={{ margin: '0 -5px 10px', background: 'none', border: 'none', padding: '0 0 6px', borderBottom: '1px solid var(--dp-border)' }}>
                  Пресеты
                </div>
                <div className="flex flex-wrap gap-2">
                  {BACKGROUND_PRESETS.map((p) => {
                    const active = background.url === p.url && background.type === 'preset'
                    return (
                      <button
                        key={p.id}
                        onClick={() => dispatch(setBackground({ ...background, type: 'preset', url: p.url }))}
                        className="px-4 py-2 rounded text-xs font-medium transition-all duration-150"
                        style={{
                          background:  active ? 'var(--dp-accent)' : 'var(--dp-bg-card)',
                          color:       active ? '#05141f' : 'var(--dp-text-secondary)',
                          border:      `1px solid ${active ? 'var(--dp-accent)' : 'var(--dp-border)'}`,
                          cursor:      'pointer',
                          boxShadow:   active ? 'var(--dp-shadow-glow)' : 'none',
                        }}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Своё изображение */}
              <section>
                <div className="dp-section-title" style={{ margin: '0 -5px 10px', background: 'none', border: 'none', padding: '0 0 6px', borderBottom: '1px solid var(--dp-border)' }}>
                  Своё изображение
                </div>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="dp-btn-ghost text-xs"
                  >
                    📁 Выбрать файл
                  </button>
                  {background.type === 'image' && (
                    <span className="text-xs" style={{ color: 'var(--dp-green)' }}>
                      ✓ Загружено
                    </span>
                  )}
                </div>
              </section>

              {/* Размытие */}
              <section>
                <div className="dp-section-title" style={{ margin: '0 -5px 10px', background: 'none', border: 'none', padding: '0 0 6px', borderBottom: '1px solid var(--dp-border)' }}>
                  Размытие —{' '}
                  <span className="font-mono" style={{ color: 'var(--dp-text-code)' }}>
                    {background.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={20} step={1}
                  value={background.blur}
                  onChange={(e) => dispatch(setBackground({ ...background, blur: +e.target.value }))}
                  className="dp-range"
                />
              </section>

              {/* Затемнение */}
              <section>
                <div className="dp-section-title" style={{ margin: '0 -5px 10px', background: 'none', border: 'none', padding: '0 0 6px', borderBottom: '1px solid var(--dp-border)' }}>
                  Затемнение —{' '}
                  <span className="font-mono" style={{ color: 'var(--dp-text-code)' }}>
                    {Math.round(background.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={1} step={0.05}
                  value={background.opacity}
                  onChange={(e) => dispatch(setBackground({ ...background, opacity: +e.target.value }))}
                  className="dp-range"
                />
              </section>

              {/* Сброс */}
              <button
                onClick={() => dispatch(setBackground({ type: 'preset', url: '', blur: 0, opacity: 0.85 }))}
                className="text-xs self-start transition-all duration-150"
                style={{
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  color:      'var(--dp-text-muted)',
                  padding:    0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dp-orange)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dp-text-muted)' }}
              >
                ✕ Сбросить фон
              </button>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
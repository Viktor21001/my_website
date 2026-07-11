/*
  BackgroundEditor — панель настройки фона.
  Появляется снизу экрана при нажатии кнопки "Настроить фон".
  
  Что умеет:
  1. Выбрать пресет из списка
  2. Загрузить своё изображение (File API)
  3. Настроить blur ползунком
  4. Настроить затемнение (opacity) ползунком
  5. Сбросить фон к дефолтному
  
  Документация File API:
  https://developer.mozilla.org/en-US/docs/Web/API/File_API
  
  Документация CSS backdrop-filter:
  https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
  
  Документация Framer Motion (анимация появления):
  https://www.framer.com/motion/animation/
*/

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setBackground } from '../../../store/slices/profileSlice'
import { setBackgroundEditorOpen } from '../../../store/slices/uiSlice'
import { BACKGROUND_PRESETS } from '../../../config/constants'

export function BackgroundEditor() {
  const dispatch    = useAppDispatch()
  const isOpen      = useAppSelector((state) => state.ui.isBackgroundEditorOpen)
  const background  = useAppSelector((state) => state.profile.user.background)

  /*
    useRef на <input type="file"> — нужен чтобы программно
    открыть диалог выбора файла при нажатии на нашу кнопку.
    Скрытый input + наша кнопка = кастомный UI без браузерной кнопки.
  */
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Закрываем панель
  function handleClose() {
    dispatch(setBackgroundEditorOpen(false))
  }

  /*
    Обработчик загрузки файла через File API.
    FileReader читает файл и конвертирует в base64 URL.
    Этот URL можно сразу использовать как background-image.
    
    Документация FileReader:
    https://developer.mozilla.org/en-US/docs/Web/API/FileReader
  */
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем что это картинка
    if (!file.type.startsWith('image/')) return

    const reader = new FileReader()

    // onload вызывается когда файл прочитан
    reader.onload = (event) => {
      const url = event.target?.result as string
      dispatch(
        setBackground({
          type: 'image',
          url,
          blur: background.blur,
          opacity: background.opacity,
        })
      )
    }

    // Запускаем чтение файла как Data URL (base64)
    reader.readAsDataURL(file)
  }

  // Выбор пресета
  function handlePresetSelect(url: string) {
    dispatch(
      setBackground({
        type: 'preset',
        url,
        blur: background.blur,
        opacity: background.opacity,
      })
    )
  }

  // Изменение blur — меняем только это поле, остальное сохраняем
  function handleBlurChange(blur: number) {
    dispatch(setBackground({ ...background, blur }))
  }

  // Изменение затемнения
  function handleOpacityChange(opacity: number) {
    dispatch(setBackground({ ...background, opacity }))
  }

  // Сброс к дефолту
  function handleReset() {
    dispatch(
      setBackground({
        type: 'preset',
        url: '',
        blur: 0,
        opacity: 0.85,
      })
    )
  }

  return (
    /*
      AnimatePresence — позволяет анимировать размонтирование компонента.
      Без него панель просто исчезает мгновенно.
      Документация: https://www.framer.com/motion/animate-presence/
    */
    <AnimatePresence>
      {isOpen && (
        <>
          {/*
            Затемнённый оверлей за панелью.
            Клик по нему закрывает редактор.
          */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/*
            Сама панель — выезжает снизу.
            initial/animate/exit — состояния анимации.
          */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'var(--dp-bg-panel)',
              borderTop: '1px solid var(--dp-border-light)',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
              maxHeight: '420px',
              overflowY: 'auto',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Шапка панели */}
            <div
              className="flex items-center justify-between px-4 py-3 sticky top-0"
              style={{
                background: 'var(--dp-bg-panel)',
                borderBottom: '1px solid var(--dp-border)',
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--dp-text-white)' }}
              >
                Настроить фон профиля
              </span>

              {/* Кнопка закрытия */}
              <button
                onClick={handleClose}
                className="text-lg leading-none transition-colors duration-150"
                style={{
                  color: 'var(--dp-text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--dp-text-white)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--dp-text-muted)'
                }}
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-5">

              {/* ── Секция: Пресеты ── */}
              <div>
                <label
                  className="dp-section-title block mb-2"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  Пресеты
                </label>

                <div className="flex gap-2 flex-wrap">
                  {BACKGROUND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset.url)}
                      className="px-3 py-1.5 text-xs rounded transition-all duration-150"
                      style={{
                        background:
                          background.url === preset.url && background.type === 'preset'
                            ? 'var(--dp-accent)'
                            : 'var(--dp-bg-card)',
                        color:
                          background.url === preset.url && background.type === 'preset'
                            ? '#000'
                            : 'var(--dp-text-primary)',
                        border: '1px solid var(--dp-border)',
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Секция: Своё изображение ── */}
              <div>
                <label
                  className="dp-section-title block mb-2"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  Своё изображение
                </label>

                {/*
                  Скрытый input type="file" — браузер открывает
                  диалог выбора файла только через него.
                  accept="image/*" — только картинки.
                */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Кнопка которая программно кликает по скрытому input */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs rounded transition-all duration-150"
                  style={{
                    background: 'var(--dp-bg-card)',
                    color: 'var(--dp-accent)',
                    border: '1px solid var(--dp-border-light)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--dp-bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--dp-bg-card)'
                  }}
                >
                  📁 Выбрать файл
                </button>

                {/* Показываем что загружено своё изображение */}
                {background.type === 'image' && (
                  <span
                    className="ml-3 text-xs"
                    style={{ color: 'var(--dp-accent-green)' }}
                  >
                    ✓ Загружено
                  </span>
                )}
              </div>

              {/* ── Секция: Размытие ── */}
              <div>
                <label
                  className="dp-section-title block mb-2"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  Размытие фона — {background.blur}px
                </label>

                {/*
                  Range input — ползунок.
                  min/max/step определяют диапазон значений.
                  Стилизуем через CSS классы ниже в index.css.
                */}
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={background.blur}
                  onChange={(e) => handleBlurChange(Number(e.target.value))}
                  className="dp-range w-full"
                />
              </div>

              {/* ── Секция: Затемнение ── */}
              <div>
                <label
                  className="dp-section-title block mb-2"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  Затемнение — {Math.round(background.opacity * 100)}%
                </label>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={background.opacity}
                  onChange={(e) => handleOpacityChange(Number(e.target.value))}
                  className="dp-range w-full"
                />
              </div>

              {/* ── Кнопка сброса ── */}
              <div>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs rounded transition-all duration-150"
                  style={{
                    background: 'transparent',
                    color: 'var(--dp-text-muted)',
                    border: '1px solid var(--dp-border)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--dp-accent-orange)'
                    e.currentTarget.style.borderColor = 'var(--dp-accent-orange)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--dp-text-muted)'
                    e.currentTarget.style.borderColor = 'var(--dp-border)'
                  }}
                >
                  Сбросить фон
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
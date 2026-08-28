/*
  AuthGate — экран для неавторизованных: переключатель Вход/Регистрация.
  Рендерится вместо PageWrapper в App.tsx, пока нет state.auth.token.
*/

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUpVariants } from '../../../hooks/useAnimatedMount'
import { LoginForm } from '../LoginForm'
import { RegisterForm } from '../RegisterForm'

type Mode = 'login' | 'register'

export function AuthGate() {
  const [mode, setMode] = useState<Mode>('login')

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
      <motion.div
        className="dp-panel w-full"
        style={{ maxWidth: 380 }}
        variants={fadeUpVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="dp-section-title" style={{ textAlign: 'center' }}>
          {mode === 'login' ? 'Вход в профиль' : 'Регистрация'}
        </div>

        <div className="p-5">
          {mode === 'login' ? <LoginForm /> : <RegisterForm />}

          <div className="text-xs text-center mt-4" style={{ color: 'var(--dp-text-muted)' }}>
            {mode === 'login' ? (
              <>
                Нет аккаунта?{' '}
                <button onClick={() => setMode('register')} className="dp-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  Зарегистрироваться
                </button>
              </>
            ) : (
              <>
                Уже есть аккаунт?{' '}
                <button onClick={() => setMode('login')} className="dp-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  Войти
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

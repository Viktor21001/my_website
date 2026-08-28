import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser } from '../../types/auth'

interface SavedAuth {
  token: string
  user: AuthUser
}

// Тот же приём, что и loadSavedBackground в profileSlice.ts —
// токен и юзер всегда выставляются/сбрасываются вместе, поэтому
// храним их одним JSON-ключом, а не двумя раздельными.
function loadSavedAuth(): SavedAuth | null {
  try {
    const raw = localStorage.getItem('dp_auth')
    return raw ? (JSON.parse(raw) as SavedAuth) : null
  } catch {
    return null
  }
}

const saved = loadSavedAuth()

interface AuthState {
  token: string | null
  user: AuthUser | null
}

const initialState: AuthState = {
  token: saved?.token ?? null,
  user: saved?.user ?? null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<SavedAuth>) {
      state.token = action.payload.token
      state.user = action.payload.user
      try {
        localStorage.setItem('dp_auth', JSON.stringify(action.payload))
      } catch {
        // localStorage недоступен (приватный режим) — не критично
      }
    },

    logout(state) {
      state.token = null
      state.user = null
      try {
        localStorage.removeItem('dp_auth')
      } catch {
        // localStorage недоступен (приватный режим) — не критично
      }
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

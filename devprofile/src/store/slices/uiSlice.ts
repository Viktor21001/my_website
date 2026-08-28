import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/*
  "Открыта ли панель настроек" — это состояние интерфейса, а не данные
  пользователя. Разделяем ответственности.

  activeSection — та же логика: какая вкладка (Dev/Fitness) открыта
  сейчас — это состояние интерфейса, не данные профиля. Кладём сюда,
  а не в локальный useState в App.tsx, чтобы избежать прокидывания
  сеттера через пропсы, если переключатель понадобится где-то ещё.

  isFavoriteGamesPickerOpen — тот же приём, что isSettingsOpen.
*/
export type ActiveSection = 'profile' | 'fitness'

interface UiState {
  isSettingsOpen: boolean
  isFavoriteGamesPickerOpen: boolean
  activeSection: ActiveSection
}

const initialState: UiState = {
  isSettingsOpen: false,
  isFavoriteGamesPickerOpen: false,
  activeSection: 'profile',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSettings(state) {
      state.isSettingsOpen = !state.isSettingsOpen
    },
    setSettingsOpen(state, action: PayloadAction<boolean>) {
      state.isSettingsOpen = action.payload
    },
    toggleFavoriteGamesPicker(state) {
      state.isFavoriteGamesPickerOpen = !state.isFavoriteGamesPickerOpen
    },
    setFavoriteGamesPickerOpen(state, action: PayloadAction<boolean>) {
      state.isFavoriteGamesPickerOpen = action.payload
    },
    setActiveSection(state, action: PayloadAction<ActiveSection>) {
      state.activeSection = action.payload
    },
  },
})

export const {
  toggleSettings,
  setSettingsOpen,
  toggleFavoriteGamesPicker,
  setFavoriteGamesPickerOpen,
  setActiveSection,
} = uiSlice.actions
export default uiSlice.reducer

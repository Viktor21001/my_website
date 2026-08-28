import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/*
  Расширяем uiSlice — добавляем состояние редактора фона.
  Почему здесь а не в profileSlice?
  "Открыта ли панель настройки" — это состояние интерфейса,
  а не данные пользователя. Разделяем ответственности.

  activeSection — та же логика: какая вкладка (Dev/Fitness) открыта
  сейчас — это состояние интерфейса, не данные профиля. Кладём сюда,
  а не в локальный useState в App.tsx, чтобы избежать прокидывания
  сеттера через пропсы, если переключатель понадобится где-то ещё.
*/
export type ActiveSection = 'profile' | 'fitness'

interface UiState {
  isBackgroundEditorOpen: boolean
  activeSection: ActiveSection
}

const initialState: UiState = {
  isBackgroundEditorOpen: false,
  activeSection: 'profile',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleBackgroundEditor(state) {
      state.isBackgroundEditorOpen = !state.isBackgroundEditorOpen
    },
    setBackgroundEditorOpen(state, action: PayloadAction<boolean>) {
      state.isBackgroundEditorOpen = action.payload
    },
    setActiveSection(state, action: PayloadAction<ActiveSection>) {
      state.activeSection = action.payload
    },
  },
})

export const { toggleBackgroundEditor, setBackgroundEditorOpen, setActiveSection } = uiSlice.actions
export default uiSlice.reducer
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/*
  Отдельный slice для UI состояний.
  Почему отдельный от profileSlice?
  "Открыт ли редактор фона" — это состояние интерфейса,
  а не данные пользователя. Разделяем ответственности.
*/
interface UiState {
  isBackgroundEditorOpen: boolean
  // Сюда потом добавим: isSettingsOpen, activeTab и т.д.
}

const initialState: UiState = {
  isBackgroundEditorOpen: false,
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
  },
})

export const { toggleBackgroundEditor, setBackgroundEditorOpen } = uiSlice.actions
export default uiSlice.reducer
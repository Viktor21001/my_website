import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/*
  Расширяем uiSlice — добавляем состояние редактора фона.
  Почему здесь а не в profileSlice?
  "Открыта ли панель настройки" — это состояние интерфейса,
  а не данные пользователя. Разделяем ответственности.
*/
interface UiState {
  isBackgroundEditorOpen: boolean
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
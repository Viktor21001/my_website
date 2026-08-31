import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/*
  "Открыта ли панель настроек" — это состояние интерфейса, а не данные
  пользователя. Разделяем ответственности.

  activeSection — та же логика: какая вкладка (General/Dev/Fitness/Games)
  открыта сейчас — это состояние интерфейса, не данные профиля. Кладём
  сюда, а не в локальный useState в App.tsx, чтобы избежать прокидывания
  сеттера через пропсы, если переключатель понадобится где-то ещё.

  isFavoriteGamesPickerOpen — тот же приём, что isSettingsOpen.
*/
export type ActiveSection = 'general' | 'profile' | 'fitness' | 'games'

const KNOWN_SECTIONS: ActiveSection[] = ['general', 'profile', 'fitness', 'games']

/*
  Начальная вкладка — предпочтение пользователя (User.defaultSection),
  а не всегда Dev. Читаем из того же localStorage['dp_auth'], что уже
  парсит authSlice.ts — слайсы независимы друг от друга, поэтому здесь
  свой маленький повтор того же чтения, а не импорт оттуда.
*/
function loadInitialSection(): ActiveSection {
  try {
    const raw = localStorage.getItem('dp_auth')
    if (!raw) return 'profile'
    const parsed = JSON.parse(raw) as { user?: { defaultSection?: string | null } }
    const saved = parsed.user?.defaultSection
    return saved && (KNOWN_SECTIONS as string[]).includes(saved) ? (saved as ActiveSection) : 'profile'
  } catch {
    return 'profile'
  }
}

interface UiState {
  isSettingsOpen: boolean
  isFavoriteGamesPickerOpen: boolean
  isAdminPanelOpen: boolean
  isSocialHubOpen: boolean
  // Открытая переписка внутри вкладки "Чаты" SocialHub — в сторе, а не
  // локальным useState внутри чата, потому что открыть конкретную переписку
  // нужно и снаружи (кнопка «Написать» на чужой строке в другом компоненте)
  activeConversationId: string | null
  // GroupDetail — отдельный оверлей (не вкладка хаба, там ещё вложенные
  // под-вкладки Стена/Участники/Чат), открывается снаружи (GroupsTab,
  // GroupsWidget) и закрывает SocialHub, если он был открыт
  activeGroupId: string | null
  activeSection: ActiveSection
}

const initialState: UiState = {
  isSettingsOpen: false,
  isFavoriteGamesPickerOpen: false,
  isAdminPanelOpen: false,
  isSocialHubOpen: false,
  activeConversationId: null,
  activeGroupId: null,
  activeSection: loadInitialSection(),
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
    toggleAdminPanel(state) {
      state.isAdminPanelOpen = !state.isAdminPanelOpen
    },
    setAdminPanelOpen(state, action: PayloadAction<boolean>) {
      state.isAdminPanelOpen = action.payload
    },
    toggleSocialHub(state) {
      state.isSocialHubOpen = !state.isSocialHubOpen
    },
    setSocialHubOpen(state, action: PayloadAction<boolean>) {
      state.isSocialHubOpen = action.payload
    },
    // Открывает конкретную переписку и сам хаб разом — используется кнопкой
    // «Написать» вне SocialHub (FriendsTab, лидерборд)
    openConversation(state, action: PayloadAction<string>) {
      state.activeConversationId = action.payload
      state.isSocialHubOpen = true
    },
    setActiveConversationId(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload
    },
    openGroup(state, action: PayloadAction<string>) {
      state.activeGroupId = action.payload
      state.isSocialHubOpen = false
    },
    setActiveGroupId(state, action: PayloadAction<string | null>) {
      state.activeGroupId = action.payload
    },
    setActiveSection(state, action: PayloadAction<ActiveSection>) {
      // Во время драга наведение на уже активную вкладку не должно
      // диспатчить лишний раз на каждый кадр — см. AppBoard.onDragOver
      if (state.activeSection === action.payload) return
      state.activeSection = action.payload
    },
  },
})

export const {
  toggleSettings,
  setSettingsOpen,
  toggleFavoriteGamesPicker,
  setFavoriteGamesPickerOpen,
  toggleAdminPanel,
  setAdminPanelOpen,
  toggleSocialHub,
  setSocialHubOpen,
  openConversation,
  setActiveConversationId,
  openGroup,
  setActiveGroupId,
  setActiveSection,
} = uiSlice.actions
export default uiSlice.reducer

import { configureStore } from '@reduxjs/toolkit'
import profileReducer from './slices/profileSlice'
import uiReducer from './slices/uiSlice'
import { githubApi } from './api/githubApi'
import { steamApi } from './api/steamApi'

/*
  configureStore — собирает все слайсы и API в единый store.
  Автоматически подключает:
  - Redux DevTools (видим стейт и экшены в браузере)
  - redux-thunk (для асинхронных действий)
*/
export const store = configureStore({
  reducer: {
    profile: profileReducer,
    ui:      uiReducer,

    // RTK Query хранит здесь кеш всех запросов
    [githubApi.reducerPath]: githubApi.reducer,
    [steamApi.reducerPath]:  steamApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      // Middleware RTK Query — управляет кешем, инвалидацией,
      // автоматическим рефетчем и очисткой устаревших данных
      .concat(githubApi.middleware)
      .concat(steamApi.middleware),
})

// Выводим типы автоматически из store — не пишем вручную
export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
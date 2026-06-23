// defineConfig — функция которая даёт TypeScript подсказки при конфигурации
import { defineConfig } from 'vite'

// Плагин для React — даёт JSX и Fast Refresh (горячая перезагрузка)
import react from '@vitejs/plugin-react'

// Плагин Tailwind для Vite — без него классы Tailwind не будут работать
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    proxy: {
      // Steam API не поддерживает CORS — браузер блокирует прямые запросы
      // Proxy решает это: запрос /steam-api/... идёт через наш сервер
      // как посредник на api.steampowered.com/...
      // Документация: https://vitejs.dev/config/server-options#server-proxy
      '/steam-api': {
        target: 'https://api.steampowered.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/steam-api/, ''),
      },
    },
  },
})
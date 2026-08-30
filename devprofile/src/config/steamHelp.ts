// Текст тултипа «как получить Steam API ключ» — используется и в
// Настройках (поле ключа), и на дублирующем «?» в неактивном блоке
// достижений (см. SettingsPanel/ConnectedAccountsSection и AchievementsLibrary)
export const STEAM_API_KEY_HELP_SECTIONS = [
  {
    title: 'Где взять Steam API ключ',
    body: 'Откройте steamcommunity.com/dev/apikey под своим Steam-аккаунтом, в поле «Domain Name» впишите любое имя (например localhost) и нажмите «Register» — ключ появится на той же странице.',
  },
  {
    title: 'Зачем он нужен',
    body: 'Только для блока «Достижения» — синхронизации получённых ачивок по всей библиотеке. Остальные Steam-панели (профиль, игры, желаемое) работают и без него.',
  },
]

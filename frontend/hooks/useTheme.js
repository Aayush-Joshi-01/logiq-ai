import { useColorScheme } from 'react-native'
import { useSettingsStore } from '../store/settingsStore'
import { DARK_THEME, LIGHT_THEME } from '../constants/theme'

export function useTheme() {
  const { theme } = useSettingsStore()
  const system = useColorScheme()
  const resolved = theme === 'system' ? system : theme
  return resolved === 'dark' ? DARK_THEME : LIGHT_THEME
}

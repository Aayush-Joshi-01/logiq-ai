import { View, Text, TouchableOpacity } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'
import { useTheme } from '../../hooks/useTheme'

const OPTIONS = ['dark', 'light', 'system']

export function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore()
  const currentTheme = useTheme()

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: currentTheme.elevated,
      borderRadius: 10,
      padding: 3,
    }}>
      {OPTIONS.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => setTheme(option)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: theme === option ? currentTheme.accent : 'transparent',
          }}
        >
          <Text style={{
            color: theme === option ? currentTheme.accentText : currentTheme.textSecondary,
            fontSize: 13,
            fontWeight: '600',
            textTransform: 'capitalize',
          }}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

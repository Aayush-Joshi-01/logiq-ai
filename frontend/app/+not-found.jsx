import { View, Text } from 'react-native'
import { Link } from 'expo-router'
import { useTheme } from '../hooks/useTheme'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const theme = useTheme()
  const { t } = useTranslation('errors')

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.textPrimary, fontSize: 18, marginBottom: 16 }}>
        {t('notFound')}
      </Text>
      <Link href="/" style={{ color: theme.accent, fontSize: 16 }}>
        Go home
      </Link>
    </View>
  )
}

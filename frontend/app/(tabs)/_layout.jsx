import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import { FEATURES } from '../../constants/features'

export default function TabsLayout() {
  const { t } = useTranslation('common')
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor:   theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: t('nav.explore') }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{ title: t('nav.myLearning') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile') }}
      />
    </Tabs>
  )
}

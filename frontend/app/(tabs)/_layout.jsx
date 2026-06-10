import { Redirect, Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { useAuthStore } from '../../store/authStore'

export default function TabsLayout() {
  const { t } = useTranslation('common')
  const theme = useTheme()
  const { user, isGuest, sessionLoaded } = useAuthStore()
  if (!sessionLoaded) return null
  if (!user && !isGuest) return <Redirect href="/(auth)/onboarding" />

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
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('nav.explore'),
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{
          title: t('nav.myLearning'),
          tabBarIcon: ({ color, size }) => <Feather name="book-open" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}

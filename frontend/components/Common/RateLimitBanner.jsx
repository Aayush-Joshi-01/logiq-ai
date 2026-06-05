import { TouchableOpacity, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useRateLimit } from '../../hooks/useRateLimit'
import { COLORS } from '../../constants/theme'
import { ROUTES } from '../../constants/routes'

export function RateLimitBanner() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { remaining, showWarning, isLimited, isPro } = useRateLimit()

  if (isPro || (!showWarning && !isLimited)) return null

  return (
    <TouchableOpacity
      onPress={() => router.push(ROUTES.SUBSCRIPTION)}
      style={{
        backgroundColor: isLimited ? `${COLORS.error}15` : `${COLORS.warning}15`,
        borderWidth: 1,
        borderColor: isLimited ? `${COLORS.error}40` : `${COLORS.warning}40`,
        borderRadius: 8,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginVertical: 8,
      }}
    >
      <Text style={{
        color: isLimited ? COLORS.error : COLORS.warning,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
      }}>
        {t('subscription.callsRemaining', { count: remaining })}
      </Text>
      <Text style={{ color: isLimited ? COLORS.error : COLORS.warning, fontSize: 13 }}>
        {t('subscription.upgradePrompt')} →
      </Text>
    </TouchableOpacity>
  )
}

import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../constants/theme'

export function OfflineBanner() {
  const { t } = useTranslation('common')
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected)
    })
    return unsubscribe
  }, [])

  if (!isOffline) return null

  return (
    <View style={{
      backgroundColor: `${COLORS.warning}22`,
      borderBottomWidth: 1,
      borderBottomColor: `${COLORS.warning}44`,
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Text style={{ color: COLORS.warning, fontSize: 13, fontWeight: '600' }}>
        {t('status.offline')} · {t('status.offlineContent')}
      </Text>
    </View>
  )
}

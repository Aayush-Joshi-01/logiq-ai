import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated'
import { useTheme } from '../../hooks/useTheme'

const VARIANTS = {
  text:       { width: '80%', height: 16, borderRadius: 4 },
  card:       { width: '100%', height: 120, borderRadius: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 24 },
  'graph-node': { width: 160, height: 80, borderRadius: 8 },
}

export function LoadingSkeleton({ variant = 'card', style }) {
  const theme = useTheme()
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true)
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
  }))

  const dims = VARIANTS[variant] || VARIANTS.card

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.elevated, ...dims },
        animatedStyle,
        style,
      ]}
    />
  )
}

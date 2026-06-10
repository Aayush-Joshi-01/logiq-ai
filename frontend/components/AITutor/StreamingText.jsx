import { useEffect, useRef } from 'react'
import { Text, Animated } from 'react-native'

// Renders text token-by-token with a blinking cursor while streaming.
export function StreamingText({ text = '', color = '#F0EBD8', style }) {
  const cursorOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [])

  return (
    <Text style={[{ fontSize: 15, lineHeight: 22, color }, style]}>
      {text}
      <Animated.Text style={{ opacity: cursorOpacity, color }}>▋</Animated.Text>
    </Text>
  )
}

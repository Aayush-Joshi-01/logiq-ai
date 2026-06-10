import { useEffect } from 'react'
import { G, Rect, Text, Circle } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated'
import { NODE_STATUS_COLORS } from '../../constants/theme'
import { NODE_WIDTH, NODE_HEIGHT, NODE_RADIUS } from './constants'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedRect   = Animated.createAnimatedComponent(Rect)

const TYPE_LABEL = {
  concept:    'CONCEPT',
  project:    'PROJECT',
  assessment: 'QUIZ',
  milestone:  'MILESTONE',
}

export function GraphNode({ node, onPress, onLongPress }) {
  const { x, y, status, title, type } = node
  const colors = NODE_STATUS_COLORS[status] || NODE_STATUS_COLORS.locked

  // Pulsing ring for in_progress
  const pulseR    = useSharedValue(0)
  const pulseOpac = useSharedValue(0)

  // Unlock pop: scale from 1.0 → 1.2 → 1.0 when status becomes 'available'
  const nodeScale = useSharedValue(1)

  useEffect(() => {
    if (status === 'in_progress') {
      pulseR.value    = 0
      pulseOpac.value = 0.45
      pulseR.value    = withRepeat(withTiming(NODE_WIDTH * 0.6, { duration: 1200, easing: Easing.out(Easing.ease) }), -1, false)
      pulseOpac.value = withRepeat(withTiming(0, { duration: 1200 }), -1, false)
    } else {
      pulseR.value    = withTiming(0, { duration: 150 })
      pulseOpac.value = withTiming(0, { duration: 150 })
    }
  }, [status])

  useEffect(() => {
    if (status === 'available') {
      nodeScale.value = withSpring(1.18, { damping: 8, stiffness: 200 }, () => {
        nodeScale.value = withSpring(1, { damping: 12 })
      })
    }
  }, [status])

  const pulseProps = useAnimatedProps(() => ({
    r:       pulseR.value,
    opacity: pulseOpac.value,
  }))

  // SVG transform origin hack: translate to center, scale, translate back
  const cx = x + NODE_WIDTH / 2
  const cy = y + NODE_HEIGHT / 2

  const nodeRectProps = useAnimatedProps(() => {
    const s  = nodeScale.value
    const dx = cx * (1 - s)
    const dy = cy * (1 - s)
    return {
      x:      x * s + dx,
      y:      y * s + dy,
      width:  NODE_WIDTH  * s,
      height: NODE_HEIGHT * s,
    }
  })

  return (
    <G onPress={() => onPress?.(node)} onLongPress={() => onLongPress?.(node)}>
      {/* Pulsing ring */}
      {status === 'in_progress' && (
        <AnimatedCircle
          cx={cx}
          cy={cy}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
          animatedProps={pulseProps}
        />
      )}

      {/* Node body with unlock scale animation */}
      <AnimatedRect
        rx={NODE_RADIUS}
        ry={NODE_RADIUS}
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={status === 'in_progress' ? 2 : 1.5}
        animatedProps={nodeRectProps}
      />

      {/* Type chip */}
      <Text
        x={x + 10}
        y={y + 16}
        fill={colors.text}
        fontSize={9}
        fontWeight="bold"
        letterSpacing={0.8}
      >
        {TYPE_LABEL[type] || type?.toUpperCase()}
      </Text>

      {/* Title — truncate at ~22 chars */}
      <Text
        x={cx}
        y={y + NODE_HEIGHT / 2 + 5}
        fill={colors.text}
        fontSize={13}
        fontWeight="600"
        textAnchor="middle"
      >
        {title?.length > 22 ? title.slice(0, 21) + '…' : title}
      </Text>
    </G>
  )
}

import { useRef, useCallback } from 'react'
import { View, Dimensions } from 'react-native'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import Svg from 'react-native-svg'
import { GraphNode } from './GraphNode'
import { GraphEdge, ArrowMarkerDef } from './GraphEdge'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const MIN_SCALE = 0.5
const MAX_SCALE = 2.0

export function GraphCanvas({ layoutNodes, layoutEdges, width, height, onNodePress, onNodeLongPress }) {
  const scale       = useSharedValue(1)
  const savedScale  = useSharedValue(1)
  const translateX  = useSharedValue(0)
  const translateY  = useSharedValue(0)
  const savedX      = useSharedValue(0)
  const savedY      = useSharedValue(0)

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
    })
    .onEnd(() => {
      savedScale.value = scale.value
    })

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX
      translateY.value = savedY.value + e.translationY
    })
    .onEnd(() => {
      savedX.value = translateX.value
      savedY.value = translateY.value
    })

  // Pinch wraps pan so both can fire simultaneously
  const composed = Gesture.Simultaneous(pinch, pan)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <GestureDetector gesture={composed}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Svg width={width} height={height}>
            <ArrowMarkerDef id="arrow" />
            {layoutEdges.map((edge) => (
              <GraphEdge key={edge.id} edge={edge} markerId="arrow" />
            ))}
            {layoutNodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                onPress={onNodePress}
                onLongPress={onNodeLongPress}
              />
            ))}
          </Svg>
        </Animated.View>
      </View>
    </GestureDetector>
  )
}

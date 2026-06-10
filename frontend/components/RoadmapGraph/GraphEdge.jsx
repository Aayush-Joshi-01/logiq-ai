import { G, Path, Defs, Marker, Polygon } from 'react-native-svg'

function pointsToCubicBezier(points) {
  if (!points || points.length < 2) return ''
  const [start, ...rest] = points
  const end = rest[rest.length - 1]

  if (rest.length === 1) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
  }

  // Build a smooth cubic bezier through all control points
  let d = `M ${start.x} ${start.y}`
  for (let i = 0; i < rest.length - 1; i++) {
    const cp = rest[i]
    const np = rest[i + 1]
    d += ` Q ${cp.x} ${cp.y} ${(cp.x + np.x) / 2} ${(cp.y + np.y) / 2}`
  }
  d += ` L ${end.x} ${end.y}`
  return d
}

export function GraphEdge({ edge, markerId = 'arrow' }) {
  const { points } = edge
  if (!points || points.length < 2) return null

  const d = pointsToCubicBezier(points)

  return (
    <Path
      d={d}
      stroke="rgba(116,140,171,0.4)"
      strokeWidth={1.5}
      fill="none"
      markerEnd={`url(#${markerId})`}
    />
  )
}

export function ArrowMarkerDef({ id = 'arrow' }) {
  return (
    <Defs>
      <Marker
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <Polygon points="0 0, 10 5, 0 10" fill="rgba(116,140,171,0.6)" />
      </Marker>
    </Defs>
  )
}

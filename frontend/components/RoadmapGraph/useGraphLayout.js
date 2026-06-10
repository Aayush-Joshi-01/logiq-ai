import { useMemo } from 'react'
import dagre from 'dagre'
import { NODE_WIDTH, NODE_HEIGHT } from './constants'

export function useGraphLayout(nodes = [], edges = []) {
  return useMemo(() => {
    if (!nodes.length) return { layoutNodes: [], layoutEdges: [], width: 0, height: 0 }

    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 40, marginy: 40 })
    g.setDefaultEdgeLabel(() => ({}))

    nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
    edges.forEach((e) => g.setEdge(e.source, e.target))

    dagre.layout(g)

    const layoutNodes = nodes.map((n) => {
      const pos = g.node(n.id)
      return {
        ...n,
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      }
    })

    const layoutEdges = edges.map((e) => {
      const edge = g.edge(e.source, e.target)
      return {
        id:     `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        points: edge?.points || [],
      }
    })

    const graphWidth  = g.graph().width  || 400
    const graphHeight = g.graph().height || 600

    return { layoutNodes, layoutEdges, width: graphWidth, height: graphHeight }
  }, [nodes, edges])
}

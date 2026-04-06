/**
 * StoryGraph — React Flow canvas for visualizing story nodes and edges.
 * Lazy-loaded via ThinkingPanel's Graph tab (never impacts initial bundle).
 * Nodes are created by @character and #plot mentions in the editor.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import 'reactflow/dist/style.css'
import { useStoryStore } from '../../store/storyStore.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const NODE_COLORS = {
  character: '#8b5cf6',
  plot:      '#c4903a',
  chapter:   '#1D9E75',
  event:     '#3b82f6',
}

function StoryNode({ data }) {
  return (
    <div style={{
      background: data.type === 'character'
        ? 'rgba(139,92,246,0.12)'
        : data.type === 'plot'
          ? 'rgba(196,144,58,0.12)'
          : data.type === 'chapter'
            ? 'rgba(29,158,117,0.12)'
            : 'rgba(59,130,246,0.12)',
      border: `1px solid ${NODE_COLORS[data.type] || 'rgba(255,255,255,0.15)'}`,
      borderRadius: '8px',
      padding: '8px 14px',
      color: '#e8e0d5',
      fontSize: '12px',
      fontWeight: 500,
      fontFamily: '"DM Sans", sans-serif',
      minWidth: '80px',
      textAlign: 'center',
      cursor: 'pointer',
      boxShadow: `0 2px 8px ${NODE_COLORS[data.type] || 'rgba(0,0,0,0.3)'}22`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: NODE_COLORS[data.type], width: 6, height: 6, border: 'none' }} />
      <div style={{
        fontSize: '9px',
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '2px',
      }}>
        {data.type}
      </div>
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: NODE_COLORS[data.type], width: 6, height: 6, border: 'none' }} />
    </div>
  )
}

const nodeTypes = { storyNode: StoryNode }

export default function StoryGraph() {
  const storeNodes = useStoryStore(state => state.nodes)
  const storeEdges = useStoryStore(state => state.edges)
  const upsertNode = useStoryStore(state => state.upsertNode)
  const addStoreEdge = useStoryStore(state => state.addEdge)
  const syncStatus = useStoryStore(state => state.sync.status)
  const syncGraph = useStoryStore(state => state.syncGraph)
  const { token } = useAuth()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Debounced Sync Effect
  useEffect(() => {
    if (Object.keys(storeNodes).length === 0) return
    const timer = setTimeout(() => syncGraph(token), 2000)
    return () => clearTimeout(timer)
  }, [storeNodes, storeEdges, token, syncGraph])

  // Sync from store → React Flow
  useEffect(() => {
    const rfNodes = Object.values(storeNodes).map(n => ({
      id: n.id,
      type: 'storyNode',
      position: n.position || { x: Math.random() * 500, y: Math.random() * 400 },
      data: { label: n.label, type: n.type },
    }))
    const rfEdges = storeEdges.map(e => ({
      id: e.id || `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 },
      animated: true,
    }))
    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [storeNodes, storeEdges])

  const onConnect = useCallback((params) => {
    const edge = { ...params, id: `e_${Date.now()}` }
    addStoreEdge(edge)
    setEdges(eds => addEdge({ ...params, style: { stroke: 'rgba(255,255,255,0.2)' }, animated: true }, eds))
  }, [addStoreEdge, setEdges])

  const onNodeDragStop = useCallback((_, node) => {
    const existing = useStoryStore.getState().nodes[node.id]
    if (existing) {
      upsertNode({ ...existing, position: node.position })
    }
  }, [upsertNode])

  const nodeCount = Object.keys(storeNodes).length

  return (
    <div style={{ width: '100%', height: '100%', background: '#07050A', position: 'relative' }}>
      {nodeCount === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          pointerEvents: 'none',
          color: 'rgba(255,255,255,0.25)',
          fontFamily: '"DM Sans", sans-serif',
          textAlign: 'center',
          padding: '20px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>⊙</div>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>No story nodes yet</div>
          <div style={{ fontSize: '12px', opacity: 0.6, maxWidth: '240px', lineHeight: 1.5 }}>
            Type <span style={{ color: '#8b5cf6', fontWeight: 600 }}>@CharacterName</span> or{' '}
            <span style={{ color: '#c4903a', fontWeight: 600 }}>#PlotPoint</span> in the editor to create nodes
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: '#07050A' }}
      >
        <Background color="rgba(255,255,255,0.04)" gap={24} />
        <Controls
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
          }}
        />
        <MiniMap
          style={{
            background: '#0d0b12',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
          }}
          nodeColor={n => NODE_COLORS[n.data?.type] || '#444'}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Sync Indicator */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '10px',
        color: syncStatus === 'saving' ? '#c9915a' : 'rgba(255,255,255,0.4)',
        fontFamily: '"DM Sans", sans-serif',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {syncStatus === 'saving' && <div className="spinner-small" />}
        {syncStatus === 'saving' ? 'Syncing to cloud...' : 'Syncing paused'}
      </div>
    </div>
  )
}

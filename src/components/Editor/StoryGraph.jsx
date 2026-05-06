/**
 * StoryGraph — React Flow canvas for visualizing story nodes and edges.
 * Lazy-loaded via ThinkingPanel's Graph tab (never impacts initial bundle).
 * Nodes are created by @character and #plot mentions in the editor.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { calculateProgressionCurve } from '../../utils/progressionCurve.js'

const NODE_COLORS = {
  character: '#8b5cf6',
  plot:      '#c4903a',
  chapter:   '#1D9E75',
  event:     '#3b82f6',
}

function StoryNode({ data }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const [editType, setEditType] = useState(data.type);

  const handleSave = (e) => {
      e.stopPropagation();
      data.onConfirm(data.id, { label: editLabel, node_type: editType });
      setIsEditing(false);
  };

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
      position: 'relative'
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
      
      {/* Confidence Pill */}
      {data.confidence_score !== undefined && data.confidence_score < 0.8 && !isEditing && (
         <div 
           onMouseEnter={() => setIsHovered(true)}
           onMouseLeave={() => setIsHovered(false)}
           style={{
             position: 'absolute', bottom: -10, right: -10,
             background: isHovered ? '#1a1a1a' : '#c9915a',
             color: '#111',
             fontSize: '9px', padding: '2px 6px', borderRadius: '10px',
             border: '1px solid #c9915a',
             cursor: 'pointer', display: 'flex', zIndex: 10,
             minWidth: '34px', justifyContent: 'center'
           }}
           title="AI Extracted. Is this accurate?"
          >
             {isHovered ? (
                 <>
                     <span onClick={(e) => { e.stopPropagation(); data.onConfirm(data.id, {}); }} style={{color:'#5AAD7F', marginRight:'4px'}}>✓ Yes</span>
                     <span onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} style={{color:'#D4614A'}}>✗ Fix</span>
                 </>
             ) : (
                 `? ${Math.round(data.confidence_score * 100)}%`
             )}
         </div>
      )}

      {/* Signal Badges */}
      {data.signals && data.signals.length > 0 && !isEditing && (
          <div style={{
              position: 'absolute', top: -10, right: -10,
              background: data.signals.some(s => s.severity === 'critical' || s.severity === 'high') ? '#D4614A' : '#C9915A',
              color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px',
              border: '2px solid #000', fontWeight: 'bold', zIndex: 11,
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)', cursor: 'help'
          }} title={`${data.signals.length} Structural Issue(s) detected`}>
              ⚠️ {data.signals.length}
          </div>
      )}

      {/* Edit Popover */}
      {isEditing && (
          <div style={{
              position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
              background: '#111', border: '1px solid #333', padding: '12px',
              borderRadius: '8px', zIndex: 20, width: '180px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
              <div style={{ fontSize: '10px', color: '#6b6560', textAlign: 'left', marginBottom: '4px' }}>Fix Extraction</div>
              <input 
                  value={editLabel} 
                  onChange={e => setEditLabel(e.target.value)} 
                  style={{ width: '100%', background: '#000', border: '1px solid #222', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              />
              <select 
                  value={editType} 
                  onChange={e => setEditType(e.target.value)}
                  style={{ width: '100%', background: '#000', border: '1px solid #222', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px' }}
              >
                  <option value="character">character</option>
                  <option value="plot">plot</option>
                  <option value="event">event</option>
                  <option value="scene">scene</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); }} style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#ccc', borderRadius: '4px', padding: '4px', fontSize: '10px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSave} style={{ flex: 1, background: '#c9915a', border: 'none', color: '#000', borderRadius: '4px', padding: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
              </div>
          </div>
      )}

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

  // Sync from store → React Flow
  useEffect(() => {
    const rfNodes = Object.values(storeNodes).map(n => ({
      id: n.id,
      type: 'storyNode',
      position: n.position || { x: Math.random() * 500, y: Math.random() * 400 },
      data: { 
          label: n.label, 
          type: n.type || n.node_type || 'event',
          confidence_score: n.confidence_score !== undefined ? n.confidence_score : 0.72,
          id: n.id,
          signals: useStoryStore.getState().analysis?.result?.allSignals?.filter(s => 
              (s.characters || []).includes(n.id) || 
              (s.region?.chapterIds || []).includes(n.id)
          ) || [],
          onConfirm: (id, updates = {}) => upsertNode({...n, ...updates, confidence_score: 1.0}),
          onFix: (id) => upsertNode({...n, confidence_score: 0.95}) 
      },
    }))
    const rfEdges = storeEdges.map(e => ({
      id: e.id || `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      style: { stroke: e.edge_type === 'conflict' ? '#D4614A' : 'rgba(255,255,255,0.2)', strokeWidth: e.edge_type === 'conflict' ? 2 : 1 },
      animated: true,
      label: e.label || '',
      labelStyle: { fill: '#9B7EC8', fontSize: 10 }
    }))
    setNodes(rfNodes)
    setEdges(rfEdges)
  }, [storeNodes, storeEdges, upsertNode])

  const [progressionCurveData, setProgressionCurveData] = React.useState(null);
  const [showProgression, setShowProgression] = React.useState(true);

  useEffect(() => {
    try {
        const snap = useStoryStore.getState();
        const pData = calculateProgressionCurve(snap);
        if(pData && pData.chapterCurves && pData.chapterCurves.length > 0) {
            setProgressionCurveData(pData);
        }
    } catch(e) { console.warn("Progression Error: ", e) }
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

  const onNodesDelete = useCallback((deleted) => {
    deleted.forEach(node => {
      import('../../api.js').then(api => {
        api.deleteNode(node.id, token).catch(err => console.error("Node deletion failed:", err))
      })
      useStoryStore.getState().removeNode(node.id)
    })
  }, [token])

  const onEdgesDelete = useCallback((deleted) => {
    deleted.forEach(edge => {
      import('../../api.js').then(api => {
        api.deleteEdge(edge.id, token).catch(err => console.error("Edge deletion failed:", err))
      })
      useStoryStore.getState().removeEdge(edge.id)
    })
  }, [token])

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
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
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
        top: '12px',
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

      {/* Progression Curve Strip */}
      {showProgression && progressionCurveData && (
          <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px',
              background: 'linear-gradient(180deg, rgba(12,12,14,0) 0%, rgba(12,12,14,0.95) 100%)',
              zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', padding: '16px', gap: '2px', alignItems: 'flex-end',
          }}>
              {progressionCurveData.chapterCurves.map((curve, idx) => (
                  <div key={idx} style={{
                      flex: 1, 
                      height: `${Math.max(10, curve.conflict_intensity * 100)}%`,
                      background: curve.conflict_intensity > 0.8 ? '#D4614A' : curve.conflict_intensity > 0.4 ? '#C9915A' : '#5A8FC9',
                      opacity: 0.8,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      position: 'relative',
                  }} title={`Conflict: ${Math.round(curve.conflict_intensity*100)}%`}>
                      <span style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', fontSize: '8px', color: '#6b6560' }}>
                          {idx+1}
                      </span>
                  </div>
              ))}
          </div>
      )}
    </div>
  )
}

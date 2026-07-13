import { useState, useCallback } from 'react'

interface SegmentNode {
  id: string
  parentId?: string
  kind: 'act' | 'sequence' | 'scene' | 'beat'
  title: string
  startMs: number
  endMs: number
  function: string
  children?: SegmentNode[]
}

interface StructureTreeProps {
  segments: SegmentNode[]
  selectedId?: string
  onSelect: (id: string) => void
  onSeek: (timeMs: number) => void
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return h + ':' + String(m % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
  return m + ':' + String(s % 60).padStart(2, '0')
}

function TreeNode({ node, selectedId, onSelect, onSeek, depth }: { node: SegmentNode; selectedId?: string; onSelect: (id: string) => void; onSeek: (ms: number) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  return (
    <div className="st-node">
      <div className={'st-node-header ' + (node.id === selectedId ? 'selected' : '')} onClick={() => { onSelect(node.id); onSeek(node.startMs) }}>
        <span className="st-toggle" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>{hasChildren ? (expanded ? '▼' : '▶') : '·'}</span>
        <span className="st-kind">{node.kind}</span>
        <span className="st-title">{node.title || node.kind + ' ' + formatTime(node.startMs)}</span>
        <span className="st-time">{formatTime(node.startMs)}-{formatTime(node.endMs)}</span>
      </div>
      {expanded && hasChildren && <div className="st-children">{node.children!.map(child => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onSeek={onSeek} depth={depth + 1} />)}</div>}
    </div>
  )
}

export default function StructureTree({ segments, selectedId, onSelect, onSeek }: StructureTreeProps): React.ReactElement {
  const buildTree = useCallback((): SegmentNode[] => {
    const map = new Map<string, SegmentNode>()
    const roots: SegmentNode[] = []
    for (const seg of segments) map.set(seg.id, { ...seg, children: [] })
    for (const seg of segments) {
      const node = map.get(seg.id)!
      if (seg.parentId && map.has(seg.parentId)) map.get(seg.parentId)!.children!.push(node)
      else roots.push(node)
    }
    return roots
  }, [segments])
  const tree = buildTree()
  return (
    <div className="structure-tree" role="tree" aria-label="Story structure">
      {tree.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>No segments yet</div>}
      {tree.map(node => <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} onSeek={onSeek} depth={0} />)}
    </div>
  )
}

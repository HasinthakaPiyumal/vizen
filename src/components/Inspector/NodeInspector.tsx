import { motion } from 'framer-motion';
import { useDiagramStore, ACCENT_COLORS } from '../../store/useDiagramStore';
import { NODE_ICON_MAP } from '../Icons';
import { IcTrash } from '../Icons';
import type { AccentKey } from '../../types';

const ACCENT_OPTIONS: { key: AccentKey; color: string }[] = [
  { key: 'blue',    color: '#7b9fff' },
  { key: 'violet',  color: '#a78bfa' },
  { key: 'mint',    color: '#34d399' },
  { key: 'green',   color: '#4ade80' },
  { key: 'pink',    color: '#f472b6' },
  { key: 'coral',   color: '#f87171' },
  { key: 'amber',   color: '#fbbf24' },
  { key: 'neutral', color: '#94a3b8' },
];

export function NodeInspector({ nodeId }: { nodeId: string }) {
  const { nodes, updateNode, deleteNode } = useDiagramStore();
  const node = nodes.find(n => n.id === nodeId);

  if (!node) return null;

  const c    = ACCENT_COLORS[node.accent] ?? ACCENT_COLORS.neutral;
  const Icon = NODE_ICON_MAP[node.type];

  return (
    <motion.div className="inspector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="insp-header">
        <div className="insp-icon" style={{ background: c.fill, border: `1px solid ${c.edge}`, color: c.color }}>
          {Icon && <Icon size={17}/>}
        </div>
        <div>
          <div className="insp-name">{node.label}</div>
          <div className="insp-type">{node.type}</div>
        </div>
      </div>

      {/* Accent color */}
      <div className="insp-section">
        <div className="insp-section-title">Accent</div>
        <div className="color-swatches">
          {ACCENT_OPTIONS.map(o => (
            <div key={o.key}
                 className={`color-sw ${node.accent === o.key ? 'selected' : ''}`}
                 style={{ background: o.color }}
                 title={o.key}
                 onClick={() => updateNode(nodeId, { accent: o.key })}/>
          ))}
        </div>
      </div>

      {/* Position & Size */}
      <div className="insp-section">
        <div className="insp-section-title">Layout</div>
        <div className="insp-row">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>X</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.x)}
                 onChange={e => updateNode(nodeId, { x: +e.target.value || 0 })}/>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>Y</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.y)}
                 onChange={e => updateNode(nodeId, { y: +e.target.value || 0 })}/>
        </div>
        <div className="insp-row">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>W</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.w)}
                 onChange={e => updateNode(nodeId, { w: Math.max(60, +e.target.value || 60) })}/>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>H</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.h)}
                 onChange={e => updateNode(nodeId, { h: Math.max(36, +e.target.value || 36) })}/>
        </div>
      </div>

      {/* Tip */}
      <div className="insp-section">
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-4)', lineHeight: 1.55 }}>
          Switch to <strong style={{ color: 'var(--fg-2)' }}>Connect</strong> tool, then drag from
          port handles to draw edges. Click an edge to configure per-step animations.
        </p>
      </div>

      {/* Delete */}
      <div className="insp-delete-row">
        <button className="btn danger" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => deleteNode(nodeId)}>
          <IcTrash size={13}/>
          <span>Delete node</span>
        </button>
      </div>
    </motion.div>
  );
}

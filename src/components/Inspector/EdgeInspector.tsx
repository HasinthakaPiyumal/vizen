import { motion } from 'framer-motion';
import { useDiagramStore } from '../../store/useDiagramStore';
import { IcTrash } from '../Icons';
import type { Step } from '../../types';

const COLOR_OPTIONS = [
  { id: '#7b9fff', label: 'blue'    },
  { id: '#a78bfa', label: 'violet'  },
  { id: '#34d399', label: 'mint'    },
  { id: '#4ade80', label: 'green'   },
  { id: '#f472b6', label: 'pink'    },
  { id: '#f87171', label: 'coral'   },
  { id: '#fbbf24', label: 'amber'   },
  { id: '#94a3b8', label: 'neutral' },
];

const LINE_TYPES = [
  { id: 'solid'  as const, label: '—',  title: 'Solid'  },
  { id: 'dashed' as const, label: '- -', title: 'Dashed' },
  { id: 'dotted' as const, label: '···', title: 'Dotted' },
];

export function EdgeInspector({ edgeId }: { edgeId: string }) {
  const { edges, steps, stepIdx, updateEdge, updateStep, updateAllSteps, deleteEdge } = useDiagramStore();
  const edge = edges.find(e => e.id === edgeId);
  if (!edge) return null;

  const step = steps[stepIdx];
  const flowEntry = step?.flows.find(f => f.edgeId === edgeId);
  const isActive = !!flowEntry;
  const color = flowEntry?.color ?? edge.defaultColor;
  const speed = flowEntry?.speed ?? 1;
  const lineType = edge.lineType ?? (edge.dashed ? 'dashed' : 'solid');
  const showHead = edge.arrowHead !== false;
  const showTail = edge.arrowTail === true;

  const toggleInStep = (idx: number) => {
    updateStep(idx, (s: Step) => {
      const has = s.flows.some(f => f.edgeId === edgeId);
      if (has) return { ...s, flows: s.flows.filter(f => f.edgeId !== edgeId) };
      return { ...s, flows: [...s.flows, { edgeId, speed: 1 }] };
    });
  };

  const setProp = (key: 'color' | 'speed', val: string | number) => {
    updateStep(stepIdx, (s: Step) => {
      const has = s.flows.some(f => f.edgeId === edgeId);
      if (has) return { ...s, flows: s.flows.map(f => f.edgeId === edgeId ? { ...f, [key]: val } : f) };
      return { ...s, flows: [...s.flows, { edgeId, [key]: val, speed: 1 }] };
    });
  };

  return (
    <motion.div className="inspector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="insp-header">
        <div className="insp-icon" style={{ background: 'transparent', border: `1px solid ${color}`, color }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 18 C8 4, 16 4, 21 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="3" cy="18" r="2" fill="currentColor"/>
            <circle cx="21" cy="18" r="2" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <div className="insp-name">{edge.label || 'Flow'}</div>
          {/* <div className="insp-type">EDGE · {edge.from} → {edge.to}</div> */}
        </div>
      </div>

      {/* Edge appearance */}
      <div className="insp-section">
        <div className="insp-section-title">Appearance</div>

        {/* Label */}
        <div className="insp-row" style={{ marginBottom: 10 }}>
          <span className="insp-label">Label</span>
          <input
            className="insp-input"
            style={{ flex: 1, maxWidth: 'none', textAlign: 'left' }}
            placeholder="optional text…"
            value={edge.label ?? ''}
            onFocus={() => useDiagramStore.getState().pushToUndo()}
            onChange={e => updateEdge(edgeId, { label: e.target.value || undefined })}
          />
        </div>

        {/* Line type */}
        <div style={{ marginBottom: 10 }}>
          <div className="insp-label" style={{ marginBottom: 8, display: 'block' }}>Line</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {LINE_TYPES.map(lt => (
              <button
                key={lt.id}
                className={`line-type-btn ${lineType === lt.id ? 'active' : ''}`}
                title={lt.title}
                onClick={() => updateEdge(edgeId, { lineType: lt.id, dashed: lt.id === 'dashed' })}
              >
                {lt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Arrow head / tail */}
        <div>
          <div className="insp-label" style={{ marginBottom: 8, display: 'block' }}>Arrows</div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              className={`arrow-toggle-btn ${showTail ? 'active' : ''}`}
              title="Arrow at source"
              onClick={() => updateEdge(edgeId, { arrowTail: !showTail })}
            >
              ← Tail
            </button>
            <button
              className={`arrow-toggle-btn ${showHead ? 'active' : ''}`}
              title="Arrow at destination"
              onClick={() => updateEdge(edgeId, { arrowHead: !showHead })}
            >
              Head →
            </button>
          </div>
        </div>
      </div>

      {/* Current step controls */}
      <div className="insp-section">
        <div className="insp-section-title">Step {stepIdx + 1} Controls</div>
        <div className="insp-row" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Animate in this step</span>
          <div className={`toggle ${isActive ? 'on' : ''}`} onClick={() => toggleInStep(stepIdx)}/>
        </div>

        {/* Flow color */}
        <div style={{ marginBottom: 10 }}>
          <div className="insp-label" style={{ marginBottom: 8, display: 'block' }}>Flow color</div>
          <div className="color-swatches">
            {COLOR_OPTIONS.map(o => (
              <div key={o.id}
                   className={`color-sw ${color === o.id ? 'selected' : ''}`}
                   style={{ background: o.id, opacity: isActive ? 1 : 0.4 }}
                   onClick={() => isActive && setProp('color', o.id)}/>
            ))}
          </div>
        </div>

        {/* Speed */}
        <div className="insp-row">
          <span style={{ fontSize: 13, color: isActive ? 'var(--fg-2)' : 'var(--fg-5)' }}>Speed</span>
          <input className="slider" type="range" min="0.3" max="2.5" step="0.1"
                 value={speed} disabled={!isActive}
                 onMouseDown={() => useDiagramStore.getState().pushToUndo()}
                 onChange={e => setProp('speed', +e.target.value)}/>
          <span className="value-mono" style={{ opacity: isActive ? 1 : 0.35 }}>{speed.toFixed(1)}×</span>
        </div>
      </div>

      {/* Per-step timeline */}
      <div className="insp-section">
        <div className="insp-section-title">Animate in steps</div>
        <div className="step-timeline">
          {steps.map((s, i) => {
            const on = s.flows.some(f => f.edgeId === edgeId);
            const cur = i === stepIdx;
            const flowColor = s.flows.find(f => f.edgeId === edgeId)?.color ?? edge.defaultColor;
            return (
              <div key={i}
                   className={`step-cell ${on ? 'on' : ''} ${cur ? 'cur' : ''}`}
                   title={`${s.taskName} — ${on ? 'active' : 'inactive'}`}
                   onClick={() => toggleInStep(i)}>
                <div className="sc-num">{i + 1}</div>
                <div className="sc-bar" style={{ background: on ? flowColor : 'transparent' }}/>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  onClick={() => updateAllSteps((s: Step) => {
                    if (s.flows.some(f => f.edgeId === edgeId)) return s;
                    return { ...s, flows: [...s.flows, { edgeId, speed: 1 }] };
                  })}>
            All steps
          </button>
          <button className="btn" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}
                  onClick={() => updateAllSteps((s: Step) => ({ ...s, flows: s.flows.filter(f => f.edgeId !== edgeId) }))}>
            Clear all
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className="insp-delete-row">
        <button className="btn danger" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => deleteEdge(edgeId)}>
          <IcTrash size={13}/>
          <span>Delete edge</span>
        </button>
      </div>
    </motion.div>
  );
}

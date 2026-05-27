import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { DiagramNode, ResizeHandle } from '../../types';
import { ACCENT_COLORS } from '../../store/useDiagramStore';

const PORT_POSITIONS = ['top', 'right', 'bottom', 'left'] as const;
type Port = typeof PORT_POSITIONS[number];

const BORDER      = 12; // border zone → start connection drag
const PORT_OFFSET = 18; // scene-units outside node edge

function getPortXY(n: DiagramNode, port: Port): [number, number] {
  switch (port) {
    case 'top':    return [n.x + n.w / 2,      n.y - PORT_OFFSET];
    case 'right':  return [n.x + n.w + PORT_OFFSET, n.y + n.h / 2];
    case 'bottom': return [n.x + n.w / 2,      n.y + n.h + PORT_OFFSET];
    case 'left':   return [n.x - PORT_OFFSET,  n.y + n.h / 2];
  }
}

const RESIZE_HANDLES: { h: ResizeHandle; pos: (n: DiagramNode) => [number, number]; cursor: string }[] = [
  { h: 'nw', pos: n => [n.x,           n.y          ], cursor: 'nw-resize' },
  { h: 'n',  pos: n => [n.x + n.w / 2, n.y          ], cursor: 'n-resize'  },
  { h: 'ne', pos: n => [n.x + n.w,     n.y          ], cursor: 'ne-resize' },
  { h: 'e',  pos: n => [n.x + n.w,     n.y + n.h / 2], cursor: 'e-resize'  },
  { h: 'se', pos: n => [n.x + n.w,     n.y + n.h    ], cursor: 'se-resize' },
  { h: 's',  pos: n => [n.x + n.w / 2, n.y + n.h    ], cursor: 's-resize'  },
  { h: 'sw', pos: n => [n.x,           n.y + n.h    ], cursor: 'sw-resize' },
  { h: 'w',  pos: n => [n.x,           n.y + n.h / 2], cursor: 'w-resize'  },
];

interface Props {
  node: DiagramNode;
  active: boolean;
  selected: boolean;
  editing?: boolean;
  tool: string;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent, id: string) => void;
  onPortDragStart: (e: React.PointerEvent, fromId: string, port: Port) => void;
  onDoubleClick?: (id: string) => void;
  onResizeStart?: (e: React.PointerEvent, id: string, handle: ResizeHandle) => void;
}

export function CanvasNode({
  node: n, active, selected, editing = false,
  tool, onSelect, onDragStart, onPortDragStart, onDoubleClick, onResizeStart,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const c   = ACCENT_COLORS[n.accent] ?? ACCENT_COLORS.neutral;
  const big = !!n.big;

  const showPorts  = (hovered || selected) && tool === 'select' && !editing;
  const innerW     = Math.max(0, n.w - BORDER * 2);
  const innerH     = Math.max(0, n.h - BORDER * 2);

  // Double-click detection via pointerdown timing.
  // Native dblclick never fires on the node because handleNodeDragStart
  // calls setPointerCapture on the SVG, which redirects compatibility
  // mouse events (click, dblclick) to the SVG element.
  const lastPdRef = useRef<{ time: number; id: string }>({ time: 0, id: '' });
  const DBLCLICK_MS = 400;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (tool === 'pan' || editing) return;
    e.stopPropagation();
    onSelect();

    // Detect double-click via rapid successive pointerdown events
    const now = performance.now();
    const prev = lastPdRef.current;
    if (prev.id === n.id && now - prev.time < DBLCLICK_MS) {
      // Double-click detected
      lastPdRef.current = { time: 0, id: '' };
      if (tool === 'select') onDoubleClick?.(n.id);
      return;                       // skip starting a drag on 2nd click
    }
    lastPdRef.current = { time: now, id: n.id };

    if (tool === 'select') {
      onDragStart(e, n.id);
    }
  }, [tool, editing, onSelect, onDragStart, onDoubleClick, n.id]);

  const gCursor = editing
    ? 'default'
    : tool === 'pan' ? 'inherit'
    : tool === 'select' ? 'crosshair'
    : 'default';

  return (
    <g
      style={{ cursor: gCursor, animation: 'node-enter 0.2s ease-out both' }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={e => { e.stopPropagation(); if (!editing) onSelect(); }}
      /* dblclick handled via pointerdown timing — see handlePointerDown */
    >
      {/* Body */}
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={big ? 12 : 9}
            fill={c.fill} stroke={c.edge} strokeWidth={1.5}
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}/>

      {/* Accent bar (big nodes) */}
      {big && <rect x={n.x} y={n.y} width={n.w} height={4} rx={2} fill={c.color} opacity={0.8}/>}

      {/* Label — hidden while in-place editor is active */}
      {!editing && (
        <foreignObject x={n.x} y={n.y} width={n.w} height={n.h}
                       style={{ pointerEvents: 'none', overflow: 'visible' }}>
          <div style={{
            width: n.w, height: n.h,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            paddingTop: big ? 10 : 0,
            paddingLeft: 10, paddingRight: 10,
            boxSizing: 'border-box',
            textAlign: 'center', overflow: 'hidden',
            pointerEvents: 'none',
          }}>
            <div
              className="node-fo-label"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: big ? 12 : 11,
                fontWeight: 800,
                color: c.color,
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{ __html: n.labelHtml ?? n.label }}
            />
          </div>
        </foreignObject>
      )}

      {/* Full-node interactive overlay — sits on top of the foreignObject label
           so pointer events are reliably captured even over the text.
           Border-vs-center detection for connection drafts is handled in
           handleNodeDragStart via scene coordinates, not by this rect. */}
      {tool === 'select' && !editing && (
        <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={big ? 12 : 9}
              fill="transparent" stroke="none"
              style={{ cursor: 'move', pointerEvents: 'all' }}/>
      )}

      {/* Active glow halo */}
      <motion.rect
        x={n.x - 2} y={n.y - 2} width={n.w + 4} height={n.h + 4} rx={(big ? 12 : 9) + 2}
        fill="none" stroke={c.color} strokeWidth={2}
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.35 }}
        style={{ opacity: 0, filter: `drop-shadow(0 0 10px ${c.tint})`, pointerEvents: 'none' }}
      />



      {/* Port dots on hover */}
      {showPorts && PORT_POSITIONS.map(port => {
        const [cx, cy] = getPortXY(n, port);
        return (
          <circle key={port} cx={cx} cy={cy} r={5}
                  fill="#7b9fff" stroke="#0c101c" strokeWidth={1.5}
                  style={{ cursor: 'crosshair', filter: 'drop-shadow(0 0 4px #7b9fff)', pointerEvents: 'all' }}
                  onPointerDown={e => { e.stopPropagation(); onPortDragStart(e, n.id, port); }}
          />
        );
      })}

      {/* Resize handles (8-point) — visible when selected and not editing */}
      {selected && !editing && onResizeStart && RESIZE_HANDLES.map(({ h, pos, cursor }) => {
        const [hx, hy] = pos(n);
        return (
          <rect key={h} x={hx - 4} y={hy - 4} width={8} height={8}
                fill="#7b9fff" stroke="#07090f" strokeWidth={1.5} rx={1.5}
                style={{ cursor, pointerEvents: 'all' }}
                onPointerDown={e => { e.stopPropagation(); onResizeStart(e, n.id, h); }}/>
        );
      })}
    </g>
  );
}

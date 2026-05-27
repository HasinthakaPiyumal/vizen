import { useMemo } from 'react';
import type { DiagramNode, DiagramEdge, FlowEntry } from '../../types';

interface Props {
  edge: DiagramEdge;
  nodes: DiagramNode[];
  flow: FlowEntry | undefined;
  selected: boolean;
  onSelect: () => void;
  onLabelDoubleClick?: (edgeId: string, sceneX: number, sceneY: number) => void;
  /** called when user starts dragging an endpoint handle to reconnect the edge */
  onEndpointDragStart?: (
    edgeId: string,
    end: 'from' | 'to',
    fixedX: number, fixedY: number,
    e: React.PointerEvent
  ) => void;
}

function getPortXY(n: DiagramNode, port: 'right' | 'left' | 'bottom' | 'top'): [number, number] {
  switch (port) {
    case 'right':  return [n.x + n.w, n.y + n.h / 2];
    case 'left':   return [n.x,       n.y + n.h / 2];
    case 'bottom': return [n.x + n.w / 2, n.y + n.h];
    case 'top':    return [n.x + n.w / 2, n.y];
  }
}

function choosePort(from: DiagramNode, to: DiagramNode): { fromPort: 'right'|'left'|'bottom'|'top'; toPort: 'right'|'left'|'bottom'|'top' } {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { fromPort: 'right', toPort: 'left' }
      : { fromPort: 'left', toPort: 'right' };
  }
  return dy >= 0
    ? { fromPort: 'bottom', toPort: 'top' }
    : { fromPort: 'top', toPort: 'bottom' };
}

function makeBezier(x1: number, y1: number, x2: number, y2: number, fromPort: string): string {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const ctrl = Math.max(40, Math.min(Math.max(dx, dy) * 0.5, 160));

  let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
  if (fromPort === 'right')  { cx1 = x1 + ctrl; cx2 = x2 - ctrl; }
  if (fromPort === 'left')   { cx1 = x1 - ctrl; cx2 = x2 + ctrl; }
  if (fromPort === 'bottom') { cy1 = y1 + ctrl; cy2 = y2 - ctrl; }
  if (fromPort === 'top')    { cy1 = y1 - ctrl; cy2 = y2 + ctrl; }

  return `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
}

function arrowHeadPts(x2: number, y2: number, cx2: number, cy2: number): string {
  const angle = Math.atan2(y2 - cy2, x2 - cx2);
  const len = 9, spread = 0.45;
  const ax = x2 - len * Math.cos(angle - spread);
  const ay = y2 - len * Math.sin(angle - spread);
  const bx = x2 - len * Math.cos(angle + spread);
  const by = y2 - len * Math.sin(angle + spread);
  return `${ax},${ay} ${x2},${y2} ${bx},${by}`;
}

function arrowTailPts(x1: number, y1: number, cx1: number, cy1: number): string {
  const angle = Math.atan2(y1 - cy1, x1 - cx1);
  const len = 9, spread = 0.45;
  const ax = x1 - len * Math.cos(angle - spread);
  const ay = y1 - len * Math.sin(angle - spread);
  const bx = x1 - len * Math.cos(angle + spread);
  const by = y1 - len * Math.sin(angle + spread);
  return `${ax},${ay} ${x1},${y1} ${bx},${by}`;
}

function getLabelPos(d: string): [number, number] {
  const m = d.match(/M([\d.-]+),([\d.-]+) C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/);
  if (!m) return [0, 0];
  const [, x0, y0, cx1, cy1, cx2, cy2, x3, y3] = m.map(Number);
  const t = 0.5, mt = 1 - t;
  const x = mt*mt*mt*x0 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x3;
  const y = mt*mt*mt*y0 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y3;
  return [x, y];
}

function getStrokeDash(edge: DiagramEdge): string | undefined {
  const lt = edge.lineType ?? (edge.dashed ? 'dashed' : 'solid');
  if (lt === 'dashed') return '7 5';
  if (lt === 'dotted') return '2 5';
  return undefined;
}

export function CanvasEdge({ edge, nodes, flow, selected, onSelect, onLabelDoubleClick, onEndpointDragStart }: Props) {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode   = nodes.find(n => n.id === edge.to);

  const { d, headPts, tailPts, labelXY, x1, y1, cx1, cy1, x2, y2, cx2, cy2 } = useMemo(() => {
    if (!fromNode || !toNode) return { d: '', headPts: '', tailPts: '', labelXY: [0,0] as [number,number], x1:0,y1:0,cx1:0,cy1:0,x2:0,y2:0,cx2:0,cy2:0 };
    const { fromPort, toPort } = choosePort(fromNode, toNode);
    const [fx, fy] = getPortXY(fromNode, fromPort);
    const [tx, ty] = getPortXY(toNode, toPort);
    const path = makeBezier(fx, fy, tx, ty, fromPort);

    const match = path.match(/M([\d.-]+),([\d.-]+) C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)/);
    const [, _x1, _y1, _cx1, _cy1, _cx2, _cy2, _x2, _y2] = (match ?? []).map(Number);

    const hp = arrowHeadPts(_x2, _y2, _cx2, _cy2);
    const tp = arrowTailPts(_x1, _y1, _cx1, _cy1);
    return {
      d: path, headPts: hp, tailPts: tp,
      labelXY: getLabelPos(path),
      x1: _x1, y1: _y1, cx1: _cx1, cy1: _cy1,
      x2: _x2, y2: _y2, cx2: _cx2, cy2: _cy2,
    };
  }, [fromNode, toNode]);

  if (!d) return null;

  const active  = !!flow;
  const color   = flow?.color ?? edge.defaultColor;
  const speed   = flow?.speed ?? 1;
  const dur     = (1.6 / speed).toFixed(2);
  const dash    = getStrokeDash(edge);
  const showHead = edge.arrowHead !== false;
  const showTail = edge.arrowTail === true;

  const labelW = Math.max(40, (edge.label?.length ?? 0) * 6.5 + 16);

  return (
    <g style={{ cursor: 'pointer' }}
       onPointerDown={e => { e.stopPropagation(); onSelect(); }}
       onClick={e => e.stopPropagation()}>
      {/* Selection halo */}
      {selected && (
        <path d={d} fill="none" stroke="#7b9fff" strokeWidth={7} strokeOpacity={0.18}
              strokeLinecap="round" strokeDasharray={dash}/>
      )}

      {/* Dim base path */}
      <path d={d} fill="none" stroke="#1e2d4a"
            strokeWidth={dash ? 1.5 : 2}
            strokeDasharray={dash}
            strokeLinecap="round"/>

      {/* Active glow path */}
      {active && (
        <path d={d} fill="none" stroke={color}
              strokeWidth={dash ? 1.5 : 2.5}
              strokeDasharray={dash}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}/>
      )}

      {/* Wide hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={14}
            strokeLinecap="round" style={{ pointerEvents: 'stroke' }}/>

      {/* Arrow head (at destination) */}
      {showHead && headPts && (
        <polygon points={headPts} fill={active ? color : '#1e2d4a'} stroke="none"/>
      )}

      {/* Arrow tail (at source) */}
      {showTail && tailPts && (
        <polygon points={tailPts} fill={active ? color : '#1e2d4a'} stroke="none"/>
      )}

      {/* Label */}
      {edge.label ? (
        <g
          style={{ cursor: 'text' }}
          onDoubleClick={e => { e.stopPropagation(); onLabelDoubleClick?.(edge.id, labelXY[0], labelXY[1]); }}
        >
          <rect x={labelXY[0] - labelW / 2} y={labelXY[1] - 9} width={labelW} height={16}
                fill="#07090f" stroke={selected ? '#7b9fff44' : '#1e2d4a'} strokeWidth={1}
                rx={4} opacity={0.9}/>
          <text x={labelXY[0]} y={labelXY[1] + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontFamily="Space Mono" fontSize={9}
                fill={active ? color : '#64748b'}>
            {edge.label}
          </text>
        </g>
      ) : (
        /* Invisible double-click target for adding a label */
        <circle cx={labelXY[0]} cy={labelXY[1]} r={10} fill="transparent"
                style={{ cursor: 'text' }}
                onDoubleClick={e => { e.stopPropagation(); onLabelDoubleClick?.(edge.id, labelXY[0], labelXY[1]); }}/>
      )}

      {/* Animated flow particles */}
      {active && [0, 1, 2].map(i => (
        <circle key={i} r={4} fill={color}
          style={{
            offsetPath: `path('${d}')`,
            offsetRotate: '0deg',
            animation: `vz-flow ${dur}s ease-in-out infinite`,
            animationDelay: `${(i * +dur / 3).toFixed(2)}s`,
            filter: `drop-shadow(0 0 5px ${color})`,
            pointerEvents: 'none',
          } as React.CSSProperties}
        />
      ))}

      {/* ── Endpoint reconnect handles (visible when selected) ── */}
      {selected && onEndpointDragStart && (
        <>
          {/* Source handle (from) — drag to reconnect the start */}
          <circle cx={x1} cy={y1} r={6}
                  fill="#7b9fff" stroke="#07090f" strokeWidth={2}
                  style={{ cursor: 'crosshair', filter: 'drop-shadow(0 0 5px #7b9fff88)', pointerEvents: 'all' }}
                  onPointerDown={e => { e.stopPropagation(); onEndpointDragStart(edge.id, 'from', x2, y2, e); }}
          />
          {/* Destination handle (to) — drag to reconnect the end */}
          <circle cx={x2} cy={y2} r={6}
                  fill="#7b9fff" stroke="#07090f" strokeWidth={2}
                  style={{ cursor: 'crosshair', filter: 'drop-shadow(0 0 5px #7b9fff88)', pointerEvents: 'all' }}
                  onPointerDown={e => { e.stopPropagation(); onEndpointDragStart(edge.id, 'to', x1, y1, e); }}
          />
        </>
      )}
    </g>
  );
}

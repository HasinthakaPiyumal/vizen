import type { DiagramNode, ConnectionDraft as Draft } from '../../types';

interface Props {
  draft: Draft;
  nodes: DiagramNode[];
  mouseXY: { x: number; y: number };
}

function portXY(n: DiagramNode, port: Draft['fromPort']): [number, number] {
  switch (port) {
    case 'right':  return [n.x + n.w, n.y + n.h / 2];
    case 'left':   return [n.x,       n.y + n.h / 2];
    case 'bottom': return [n.x + n.w / 2, n.y + n.h];
    case 'top':    return [n.x + n.w / 2, n.y];
  }
}

export function ConnectionDraftLine({ draft, nodes, mouseXY }: Props) {
  const fromNode = nodes.find(n => n.id === draft.fromId);
  if (!fromNode) return null;

  const [x1, y1] = portXY(fromNode, draft.fromPort);
  const x2 = mouseXY.x;
  const y2 = mouseXY.y;

  const ctrl = Math.max(40, Math.abs(x2 - x1) * 0.5);
  let cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
  if (draft.fromPort === 'right')  { cx1 = x1 + ctrl; cx2 = x2 - ctrl; }
  if (draft.fromPort === 'left')   { cx1 = x1 - ctrl; cx2 = x2 + ctrl; }
  if (draft.fromPort === 'bottom') { cy1 = y1 + ctrl; cy2 = y2 - ctrl; }
  if (draft.fromPort === 'top')    { cy1 = y1 - ctrl; cy2 = y2 + ctrl; }

  const d = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} fill="none" stroke="#7b9fff" strokeWidth={1.5}
            strokeDasharray="5 3" strokeLinecap="round" opacity={0.7}/>
      <circle cx={x2} cy={y2} r={4} fill="#7b9fff" opacity={0.8}
              style={{ filter: 'drop-shadow(0 0 4px #7b9fff)' }}/>
    </g>
  );
}

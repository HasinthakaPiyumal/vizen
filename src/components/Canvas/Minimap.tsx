import { useRef } from 'react';
import type { DiagramNode, DiagramEdge } from '../../types';
import { ACCENT_COLORS } from '../../store/useDiagramStore';

interface Props {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  zoom: number;
  pan: { x: number; y: number };
  canvasW: number;
  canvasH: number;
  onPanChange: (newPan: { x: number; y: number }) => void;
}

const MM_W = 188;
const MM_H = 108;
const SCENE_W = 1000;
const SCENE_H = 600;

export function Minimap({ nodes, edges, zoom, pan, canvasW, canvasH, onPanChange }: Props) {
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;
  const vpW = canvasW / zoom;
  const vpH = canvasH / zoom;

  const dragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleVpPointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
  };

  const handleVpPointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!dragRef.current) return;
    const scaleX = MM_W / SCENE_W;
    const scaleY = MM_H / SCENE_H;
    const dxPx = e.clientX - dragRef.current.startX;
    const dyPx = e.clientY - dragRef.current.startY;
    const dxScene = dxPx / scaleX;
    const dyScene = dyPx / scaleY;
    onPanChange({
      x: dragRef.current.startPan.x - dxScene * zoom,
      y: dragRef.current.startPan.y - dyScene * zoom,
    });
  };

  const handleVpPointerUp = () => { dragRef.current = null; };

  return (
    <div className="minimap">
      <span className="minimap-label">Mini-map</span>
      <svg ref={svgRef} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} width={MM_W} height={MM_H}
           preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        {edges.map(e => {
          const fn = nodes.find(n => n.id === e.from);
          const tn = nodes.find(n => n.id === e.to);
          if (!fn || !tn) return null;
          return (
            <line key={e.id}
                  x1={fn.x + fn.w / 2} y1={fn.y + fn.h / 2}
                  x2={tn.x + tn.w / 2} y2={tn.y + tn.h / 2}
                  stroke="#1e2d4a" strokeWidth={4}/>
          );
        })}
        {nodes.map(n => {
          const c = ACCENT_COLORS[n.accent] ?? ACCENT_COLORS.neutral;
          return <rect key={n.id} x={n.x} y={n.y} width={n.w} height={n.h} rx={6} fill={c.color} opacity={0.8}/>;
        })}
        {/* Draggable viewport rect */}
        <rect x={vpX} y={vpY} width={vpW} height={vpH}
              fill="rgba(123,159,255,0.06)" stroke="#7b9fff" strokeWidth={8} rx={6}
              style={{ cursor: 'grab' }}
              onPointerDown={handleVpPointerDown}
              onPointerMove={handleVpPointerMove}
              onPointerUp={handleVpPointerUp}
        />
      </svg>
    </div>
  );
}

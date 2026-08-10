import { useRef, useState, useCallback, useEffect } from 'react';
import { useDiagramStore, TYPE_COLORS_MAP, ACCENT_COLORS } from '../../store/useDiagramStore';
import { CanvasNode } from './CanvasNode';
import { CanvasEdge } from './CanvasEdge';
import { ConnectionDraftLine } from './ConnectionDraft';
import type { ConnectionDraft, DiagramNode, ResizeHandle, Snapshot } from '../../types';
import { IcCursor } from '../Icons';

interface DragState       { nodeId: string; startX: number; startY: number; nodeIds: string[]; origins: Record<string, { x: number; y: number }> }
interface PendingNodeDrag { pointerId: number; nodeId: string; startClientX: number; startClientY: number; startX: number; startY: number; nodeIds: string[]; origins: Record<string, { x: number; y: number }>; isShift: boolean; wasAlreadySelected: boolean }
interface Ripple       { id: number; x: number; y: number }
interface TrailPoint   { x: number; y: number; t: number }
interface EdgeReconnect { edgeId: string; end: 'from' | 'to'; fixedX: number; fixedY: number }
interface ResizeDrag    { nodeId: string; handle: ResizeHandle; startSX: number; startSY: number; origX: number; origY: number; origW: number; origH: number }
interface RectSelect    { sx: number; sy: number; ex: number; ey: number }

interface Props {
  presenting?: boolean;
  onExitPresent?: () => void;
}

function FormatBar({ onFmt, extended = false }: { onFmt: (cmd: string, val?: string) => void; extended?: boolean }) {
  const mb = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className="fmt-toolbar">
      <button className="fmt-btn" style={{ fontWeight: 'bold' }}          onMouseDown={mb} onClick={() => onFmt('bold')}><b>B</b></button>
      <button className="fmt-btn" style={{ fontStyle: 'italic' }}         onMouseDown={mb} onClick={() => onFmt('italic')}><i>I</i></button>
      <button className="fmt-btn" style={{ textDecoration: 'underline' }} onMouseDown={mb} onClick={() => onFmt('underline')}><u>U</u></button>
      <button className="fmt-btn" style={{ textDecoration: 'line-through' }} onMouseDown={mb} onClick={() => onFmt('strikeThrough')}>S̶</button>
      <div className="fmt-div"/>
      {(['H1','H2','H3'] as const).map(h => (
        <button key={h} className="fmt-btn fmt-h" onMouseDown={mb} onClick={() => onFmt('formatBlock', h.toLowerCase())}>{h}</button>
      ))}
      <button className="fmt-btn fmt-h" onMouseDown={mb} onClick={() => onFmt('formatBlock', 'p')}>¶</button>
      {extended && <>
        <div className="fmt-div"/>
        <button className="fmt-btn fmt-h" title="Inline code" onMouseDown={mb}
          onClick={() => {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) {
              const r = sel.getRangeAt(0);
              const code = document.createElement('code');
              code.style.fontFamily = 'Space Mono, monospace';
              code.style.fontSize = '0.88em';
              code.style.opacity = '0.8';
              r.surroundContents(code);
            }
          }}>&lt;/&gt;</button>
      </>}
      <div className="fmt-div"/>
      <button className="fmt-btn" title="Clear formatting" onMouseDown={mb} onClick={() => onFmt('removeFormat')}>✕</button>
    </div>
  );
}

type PortDir = 'top' | 'right' | 'bottom' | 'left';

function nearestPort(n: DiagramNode, x: number, y: number): PortDir {
  const candidates: { port: PortDir; px: number; py: number }[] = [
    { port: 'top',    px: n.x + n.w / 2, py: n.y           },
    { port: 'right',  px: n.x + n.w,     py: n.y + n.h / 2 },
    { port: 'bottom', px: n.x + n.w / 2, py: n.y + n.h     },
    { port: 'left',   px: n.x,           py: n.y + n.h / 2  },
  ];
  let bestPort: PortDir = 'right', bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.px - x, c.py - y);
    if (d < bestDist) { bestDist = d; bestPort = c.port; }
  }
  return bestPort;
}

export function Canvas({ presenting, onExitPresent }: Props) {
  const store = useDiagramStore();
  const { nodes, edges, steps, stepIdx, selection, tool, zoom, pan, clipboard } = store;
  const step    = steps[stepIdx];
  const lit     = new Set(step?.lit ?? []);
  const flowMap = new Map((step?.flows ?? []).map(f => [f.edgeId, f]));

  const wrapRef      = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const editorRef    = useRef<HTMLDivElement>(null);
  const edgeLabelRef = useRef<HTMLInputElement>(null);
  const rippleIdRef  = useRef(0);
  const laserTrailRef = useRef<TrailPoint[]>([]);
  const laserDrawingRef = useRef(false);
  const laserRafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevViewRef  = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const initialNodeHeightRef = useRef<number>(56);
  const gestureStartSnapshotRef = useRef<Snapshot | null>(null);

  const [nodeDrag,    setNodeDrag]    = useState<DragState | null>(null);
  const pendingNodeDragRef = useRef<PendingNodeDrag | null>(null);
  const justOpenedNodeEditorRef = useRef(false);
  const [draft,       setDraft]       = useState<ConnectionDraft | null>(null);
  const [reconnect,   setReconnect]   = useState<EdgeReconnect | null>(null);
  const [mouseXY,     setMouseXY]     = useState({ x: 0, y: 0 });
  const [editingNodeId,       setEditingNodeId]       = useState<string | null>(null);
  const [editingEdgeLabelId,  setEditingEdgeLabelId]  = useState<string | null>(null);
  const [editingEdgeLabelPos, setEditingEdgeLabelPos] = useState({ x: 0, y: 0 });
  const [laserPos,  setLaserPos]  = useState({ x: 0, y: 0 });
  const [laserMode, setLaserMode] = useState(false);
  const [ripples,   setRipples]   = useState<Ripple[]>([]);
  const [panDrag,    setPanDrag]    = useState<{ startPan: typeof pan; startX: number; startY: number } | null>(null);
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ guideX?: number; guideY?: number }>({});
  const [rectSelect, setRectSelect] = useState<RectSelect | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneX: number; sceneY: number } | null>(null);

  // ── Auto-fit on first mount ──
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current || !wrapRef.current || !nodes.length) return;

    let handle: number;
    const tryFit = () => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        handle = requestAnimationFrame(tryFit);
        return;
      }
      hasFit.current = true;
      const pad = 72;
      const xs = nodes.map(n => n.x), xe = nodes.map(n => n.x + n.w);
      const ys = nodes.map(n => n.y), ye = nodes.map(n => n.y + n.h);
      const minX = Math.min(...xs), maxX = Math.max(...xe);
      const minY = Math.min(...ys), maxY = Math.max(...ye);
      const sceneW = maxX - minX, sceneH = maxY - minY;
      const z = Math.min((rect.width - pad * 2) / sceneW, (rect.height - pad * 2) / sceneH, 1.2);
      store.setZoom(z);
      store.setPan({ x: (rect.width - sceneW * z) / 2 - minX * z, y: (rect.height - sceneH * z) / 2 - minY * z });
    };

    handle = requestAnimationFrame(tryFit);
    return () => cancelAnimationFrame(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ── Native wheel: scroll=pan, ctrl/pinch=zoom ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: z, pan: p, setZoom, setPan } = useDiagramStore.getState();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 16;
        else if (e.deltaMode === 2) delta *= 800;

        delta = Math.max(-120, Math.min(120, delta));
        const zoomFactor = Math.pow(0.9985, delta);
        const newZ = Math.max(0.15, Math.min(4, z * zoomFactor));

        if (Math.abs(newZ - z) > 0.0001) {
          setZoom(newZ);
          setPan({
            x: mx - (mx - p.x) * (newZ / z),
            y: my - (my - p.y) * (newZ / z),
          });
        }
      } else {
        let dx = e.deltaX;
        let dy = e.deltaY;
        if (e.deltaMode === 1) { dx *= 16; dy *= 16; }
        else if (e.deltaMode === 2) { dx *= 800; dy *= 800; }

        setPan({ x: p.x - dx, y: p.y - dy });
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const toScene = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const fitView = useCallback(() => {
    if (!wrapRef.current) return;
    const { nodes: currentNodes, setZoom, setPan } = useDiagramStore.getState();
    if (!currentNodes.length) return;
    const rect = wrapRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const pad = 64;
    const xs = currentNodes.map(n => n.x), xe = currentNodes.map(n => n.x + n.w);
    const ys = currentNodes.map(n => n.y), ye = currentNodes.map(n => n.y + n.h);
    const minX = Math.min(...xs), maxX = Math.max(...xe);
    const minY = Math.min(...ys), maxY = Math.max(...ye);
    const sceneW = maxX - minX, sceneH = maxY - minY;
    const z = Math.min((rect.width - pad * 2) / sceneW, (rect.height - pad * 2) / sceneH, 1.5);
    setZoom(z);
    setPan({ x: (rect.width - sceneW * z) / 2 - minX * z, y: (rect.height - sceneH * z) / 2 - minY * z });
  }, []);

  // ── Fit canvas when entering/exiting presentation; save & restore view ──
  useEffect(() => {
    if (!wrapRef.current) return;
    if (presenting) {
      const state = useDiagramStore.getState();
      prevViewRef.current = { zoom: state.zoom, pan: { ...state.pan } };
      const t = setTimeout(fitView, 80);
      return () => clearTimeout(t);
    } else {
      setLaserMode(false);
      const prev = prevViewRef.current;
      if (prev) {
        store.setZoom(prev.zoom);
        store.setPan(prev.pan);
        prevViewRef.current = null;
      }
    }
  }, [presenting]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SVG pointer events (disabled in present mode) ──
  const onSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (presenting) return;
    if (tool === 'pan' || e.button === 1) {
      e.preventDefault();
      setPanDrag({ startPan: pan, startX: e.clientX, startY: e.clientY });
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === 'select') {
      // Start a rect-select; determine on pointerUp whether it was a click or drag
      const sc = toScene(e.clientX, e.clientY);
      setRectSelect({ sx: sc.x, sy: sc.y, ex: sc.x, ey: sc.y });
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    }
  }, [presenting, tool, pan, toScene]);

  const onSvgPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const sc = toScene(e.clientX, e.clientY);
    setMouseXY(sc);
    if (presenting) return;

    // ── Promote pending node drag → active drag (deferred capture) ──
    if (pendingNodeDragRef.current) {
      const p = pendingNodeDragRef.current;
      const dx = e.clientX - p.startClientX, dy = e.clientY - p.startClientY;
      if (Math.hypot(dx, dy) > 3) {
        (svgRef.current as Element | null)?.setPointerCapture?.(p.pointerId);
        gestureStartSnapshotRef.current = store.getSnapshot();
        if (p.nodeIds.length > 1) {
          store.setSelection({ type: 'multi', ids: p.nodeIds });
        } else if (p.nodeIds.length === 1) {
          store.setSelection({ type: 'node', id: p.nodeIds[0] });
        }
        setNodeDrag({
          nodeId: p.nodeId, startX: p.startX, startY: p.startY,
          nodeIds: p.nodeIds, origins: p.origins,
        });
        pendingNodeDragRef.current = null;
      } else {
        return;
      }
    }

    if (panDrag) {
      store.setPan({ x: panDrag.startPan.x + (e.clientX - panDrag.startX), y: panDrag.startPan.y + (e.clientY - panDrag.startY) });
      return;
    }

    // ── Rect-select rubber band ──
    if (rectSelect) {
      setRectSelect(r => r ? { ...r, ex: sc.x, ey: sc.y } : null);
      return;
    }

    // ── Resize node ──
    if (resizeDrag) {
      const MIN_W = 60, MIN_H = 36;
      const dx = sc.x - resizeDrag.startSX, dy = sc.y - resizeDrag.startSY;
      const { origX, origY, origW, origH } = resizeDrag;
      let x = origX, y = origY, w = origW, h = origH;
      switch (resizeDrag.handle) {
        case 'nw': x = origX+dx; w = origW-dx; y = origY+dy; h = origH-dy; break;
        case 'n':                               y = origY+dy; h = origH-dy; break;
        case 'ne':             w = origW+dx;    y = origY+dy; h = origH-dy; break;
        case 'e':              w = origW+dx;                               break;
        case 'se':             w = origW+dx;                  h = origH+dy; break;
        case 's':                                             h = origH+dy; break;
        case 'sw': x = origX+dx; w = origW-dx;               h = origH+dy; break;
        case 'w':  x = origX+dx; w = origW-dx;                             break;
      }
      if (w < MIN_W) { if (['nw','sw','w'].includes(resizeDrag.handle)) x = origX+origW-MIN_W; w = MIN_W; }
      if (h < MIN_H) { if (['nw','n','ne'].includes(resizeDrag.handle)) y = origY+origH-MIN_H; h = MIN_H; }
      store.updateNode(resizeDrag.nodeId, { x, y, w: Math.round(w), h: Math.round(h) });
      return;
    }

    // ── Move node or group of nodes with alignment snap ──
    if (nodeDrag) {
      const SNAP = 8;
      const anchorOrigin = nodeDrag.origins[nodeDrag.nodeId] ?? { x: 0, y: 0 };
      const rawDx = sc.x - nodeDrag.startX;
      const rawDy = sc.y - nodeDrag.startY;

      let nx = anchorOrigin.x + rawDx;
      let ny = anchorOrigin.y + rawDy;

      const state = useDiagramStore.getState();
      const anchorNode = state.nodes.find(n => n.id === nodeDrag.nodeId);
      const draggedSet = new Set(nodeDrag.nodeIds);
      const unselectedNodes = state.nodes.filter(n => !draggedSet.has(n.id));

      let guideX: number | undefined, guideY: number | undefined;

      if (anchorNode) {
        let bdx = SNAP, bdy = SNAP;
        for (const o of unselectedNodes) {
          for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) {
            for (const off of [0, anchorNode.w / 2, anchorNode.w]) {
              const d = Math.abs((nx + off) - ox);
              if (d < bdx) { bdx = d; nx = ox - off; guideX = ox; }
            }
          }
          for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) {
            for (const off of [0, anchorNode.h / 2, anchorNode.h]) {
              const d = Math.abs((ny + off) - oy);
              if (d < bdy) { bdy = d; ny = oy - off; guideY = oy; }
            }
          }
        }
        setSnapGuides({ guideX, guideY });
      }

      const finalDx = nx - anchorOrigin.x;
      const finalDy = ny - anchorOrigin.y;

      const updates = nodeDrag.nodeIds.map(nId => {
        const orig = nodeDrag.origins[nId] ?? { x: 0, y: 0 };
        return { id: nId, x: orig.x + finalDx, y: orig.y + finalDy };
      });

      store.updateNodesPos(updates);
    }
  }, [presenting, panDrag, rectSelect, resizeDrag, nodeDrag, toScene, store]);

  const onSvgPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Check if there was a pending drag that was not promoted to active drag (plain click)
    if (pendingNodeDragRef.current) {
      const p = pendingNodeDragRef.current;
      pendingNodeDragRef.current = null;

      if (p.isShift) {
        const currentSel = store.selection;
        if (currentSel?.type === 'multi') {
          const exists = currentSel.ids.includes(p.nodeId);
          const newIds = exists
            ? currentSel.ids.filter(id => id !== p.nodeId)
            : [...currentSel.ids, p.nodeId];
          if (newIds.length === 0) store.setSelection(null);
          else if (newIds.length === 1) store.setSelection({ type: 'node', id: newIds[0] });
          else store.setSelection({ type: 'multi', ids: newIds });
        } else if (currentSel?.type === 'node') {
          if (currentSel.id === p.nodeId) store.setSelection(null);
          else store.setSelection({ type: 'multi', ids: [currentSel.id, p.nodeId] });
        } else {
          store.setSelection({ type: 'node', id: p.nodeId });
        }
      } else {
        const clickedNode = nodes.find(n => n.id === p.nodeId);
        if (clickedNode?.groupId) {
          const groupNodes = nodes.filter(n => n.groupId === clickedNode.groupId);
          if (groupNodes.length > 1) {
            store.setSelection({ type: 'multi', ids: groupNodes.map(n => n.id) });
          } else {
            store.setSelection({ type: 'node', id: p.nodeId });
          }
        } else {
          store.setSelection({ type: 'node', id: p.nodeId });
        }
      }
    }

    if (presenting) { setPanDrag(null); setNodeDrag(null); return; }

    setSnapGuides({});

    // ── Rect-select end ──
    if (rectSelect) {
      const r = rectSelect;
      setRectSelect(null);
      const W = Math.abs(r.ex - r.sx), H = Math.abs(r.ey - r.sy);
      if (W < 5 && H < 5) {
        // Tiny movement → treat as click → clear selection
        store.setSelection(null);
      } else {
        const minX = Math.min(r.sx, r.ex), maxX = Math.max(r.sx, r.ex);
        const minY = Math.min(r.sy, r.ey), maxY = Math.max(r.sy, r.ey);
        const hit = useDiagramStore.getState().nodes.filter(n =>
          n.x < maxX && n.x + n.w > minX && n.y < maxY && n.y + n.h > minY
        );
        if      (hit.length === 0) store.setSelection(null);
        else if (hit.length === 1) store.setSelection({ type: 'node', id: hit[0].id });
        else                       store.setSelection({ type: 'multi', ids: hit.map(n => n.id) });
      }
      setPanDrag(null); setNodeDrag(null);
      return;
    }

    // ── Resize end ──
    if (resizeDrag) {
      if (gestureStartSnapshotRef.current) {
        const mv = nodes.find(n => n.id === resizeDrag.nodeId);
        if (mv && (mv.w !== resizeDrag.origW || mv.h !== resizeDrag.origH || mv.x !== resizeDrag.origX || mv.y !== resizeDrag.origY)) {
          store.pushSnapshotToUndo(gestureStartSnapshotRef.current);
        }
      }
      setResizeDrag(null); setPanDrag(null); setNodeDrag(null);
      return;
    }

    // ── Drag end ──
    if (nodeDrag) {
      if (gestureStartSnapshotRef.current) {
        const stateNodes = useDiagramStore.getState().nodes;
        const anchorNode = stateNodes.find(n => n.id === nodeDrag.nodeId);
        const anchorOrig = nodeDrag.origins[nodeDrag.nodeId];
        if (anchorNode && anchorOrig && (anchorNode.x !== anchorOrig.x || anchorNode.y !== anchorOrig.y)) {
          store.pushSnapshotToUndo(gestureStartSnapshotRef.current);
        }
      }
      setNodeDrag(null); setPanDrag(null);
      return;
    }

    // ── Edge endpoint reconnect ──
    if (reconnect) {
      const sc = toScene(e.clientX, e.clientY);
      const edge = edges.find(ed => ed.id === reconnect.edgeId);
      const fixedNodeId = edge ? (reconnect.end === 'from' ? edge.to : edge.from) : null;
      const target = nodes.find(n =>
        n.id !== fixedNodeId &&            // can't collapse both ends to same node
        sc.x >= n.x - 14 && sc.x <= n.x + n.w + 14 &&
        sc.y >= n.y - 14 && sc.y <= n.y + n.h + 14
      );
      if (target) {
        store.updateEdge(reconnect.edgeId,
          reconnect.end === 'from' ? { from: target.id } : { to: target.id }
        );
      }
      setReconnect(null);
      setPanDrag(null);
      setNodeDrag(null);
      return;
    }

    // ── New edge draft ──
    if (draft) {
      const sc = toScene(e.clientX, e.clientY);
      const target = nodes.find(n =>
        n.id !== draft.fromId &&
        sc.x >= n.x - 12 && sc.x <= n.x + n.w + 12 &&
        sc.y >= n.y - 12 && sc.y <= n.y + n.h + 12
      );
      if (target) {
        const color = TYPE_COLORS_MAP[nodes.find(n => n.id === draft.fromId)?.type ?? ''] ?? '#7b9fff';
        store.addEdge(draft.fromId, target.id, color);
      }
      setDraft(null);
    }
    setPanDrag(null);
    setNodeDrag(null);
  }, [presenting, rectSelect, resizeDrag, reconnect, draft, edges, nodes, toScene, store]);

  const BORDER = 12;

  const handleNodeDragStart = useCallback((e: React.PointerEvent, id: string) => {
    if (presenting) return;
    const sc   = toScene(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const onBorder =
      sc.x < node.x + BORDER || sc.x > node.x + node.w - BORDER ||
      sc.y < node.y + BORDER || sc.y > node.y + node.h - BORDER;
    if (onBorder) {
      // Drafts always need capture immediately (cursor tracking)
      (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
      setDraft({ fromId: id, fromPort: nearestPort(node, sc.x, sc.y), x: sc.x, y: sc.y });
    } else {
      const currentSel = store.selection;
      const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
      let targetIds: string[] = [];
      let wasAlreadySelected = false;

      if (currentSel?.type === 'multi' && currentSel.ids.includes(id)) {
        wasAlreadySelected = true;
        targetIds = [...currentSel.ids];
      } else if (currentSel?.type === 'node' && currentSel.id === id) {
        wasAlreadySelected = true;
        targetIds = [id];
      } else {
        wasAlreadySelected = false;
        if (isShift) {
          if (currentSel?.type === 'multi') {
            targetIds = currentSel.ids.includes(id) ? currentSel.ids : [...currentSel.ids, id];
          } else if (currentSel?.type === 'node') {
            targetIds = currentSel.id === id ? [id] : [currentSel.id, id];
          } else {
            targetIds = [id];
          }
        } else {
          if (node.groupId) {
            const groupNodes = nodes.filter(n => n.groupId === node.groupId);
            targetIds = groupNodes.length > 1 ? groupNodes.map(n => n.id) : [id];
          } else {
            targetIds = [id];
          }
        }
      }

      const origins: Record<string, { x: number; y: number }> = {};
      targetIds.forEach(tId => {
        const n = nodes.find(item => item.id === tId);
        if (n) origins[tId] = { x: n.x, y: n.y };
      });

      pendingNodeDragRef.current = {
        pointerId: e.pointerId,
        nodeId: id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: sc.x, startY: sc.y,
        nodeIds: targetIds,
        origins,
        isShift,
        wasAlreadySelected,
      };
    }
  }, [presenting, nodes, toScene, store]);

  const handlePortDragStart = useCallback((e: React.PointerEvent, fromId: string, port: PortDir) => {
    if (presenting) return;
    e.stopPropagation();
    (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
    setDraft({ fromId, fromPort: port, x: mouseXY.x, y: mouseXY.y });
  }, [presenting, mouseXY]);

  const handleEndpointDragStart = useCallback((
    edgeId: string, end: 'from' | 'to',
    fixedX: number, fixedY: number,
    e: React.PointerEvent
  ) => {
    if (presenting) return;
    (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
    store.setSelection({ type: 'edge', id: edgeId });
    setReconnect({ edgeId, end, fixedX, fixedY });
  }, [presenting, store]);

  const handleResizeStart = useCallback((e: React.PointerEvent, id: string, handle: ResizeHandle) => {
    if (presenting) return;
    const sc = toScene(e.clientX, e.clientY);
    const node = useDiagramStore.getState().nodes.find(n => n.id === id);
    if (!node) return;
    (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
    store.setSelection({ type: 'node', id });
    gestureStartSnapshotRef.current = store.getSnapshot();
    setResizeDrag({ nodeId: id, handle, startSX: sc.x, startSY: sc.y, origX: node.x, origY: node.y, origW: node.w, origH: node.h });
  }, [presenting, store, toScene]);

  // ── Keyboard: shortcuts (undo, redo, clipboard, delete) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      if (document.activeElement?.tagName === 'TEXTAREA') return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Clipboard shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        store.copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        store.cutSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        store.pasteSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        store.duplicateSelection();
        return;
      }

      // Group / Ungroup shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        if (e.shiftKey) {
          store.ungroupSelection();
        } else {
          store.groupSelection();
        }
        return;
      }

      // Zoom & Fit shortcuts (Ctrl + '+', Ctrl + '-', Ctrl + R, Ctrl + 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          const { zoom: z, pan: p, setZoom, setPan } = useDiagramStore.getState();
          const el = wrapRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const mx = rect.width / 2, my = rect.height / 2;
            const newZ = Math.min(4, z * 1.25);
            setZoom(newZ);
            setPan({ x: mx - (mx - p.x) * (newZ / z), y: my - (my - p.y) * (newZ / z) });
          }
          return;
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const { zoom: z, pan: p, setZoom, setPan } = useDiagramStore.getState();
          const el = wrapRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            const mx = rect.width / 2, my = rect.height / 2;
            const newZ = Math.max(0.15, z / 1.25);
            setZoom(newZ);
            setPan({ x: mx - (mx - p.x) * (newZ / z), y: my - (my - p.y) * (newZ / z) });
          }
          return;
        }

        if (e.key === 'r' || e.key === 'R' || e.key === '0') {
          e.preventDefault();
          fitView();
          return;
        }
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') { store.setTool('select'); return; }
      if (e.key === 'h' || e.key === 'H') { store.setTool('pan');    return; }

      // Delete
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const { selection } = useDiagramStore.getState();
      if (!selection) return;
      e.preventDefault();
      if      (selection.type === 'node')  store.deleteNode(selection.id);
      else if (selection.type === 'edge')  store.deleteEdge(selection.id);
      else if (selection.type === 'multi') store.deleteNodes(selection.ids);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, fitView]);

  // ── Context menu click-away closer ──
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = (e: Event) => {
      const target = e.target as Element;
      if (target && target.closest('.context-menu')) return;
      setContextMenu(null);
    };
    window.addEventListener('pointerdown', handleClose);
    return () => {
      window.removeEventListener('pointerdown', handleClose);
    };
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (presenting) return;
    e.preventDefault();

    // Check if right-clicked a node or edge
    const nodeEl = (e.target as Element).closest('.node-group');
    const edgeEl = (e.target as Element).closest('.edge-group');

    if (nodeEl) {
      const id = nodeEl.getAttribute('data-id');
      if (id) {
        const currentSel = store.selection;
        if (currentSel?.type === 'multi' && currentSel.ids.includes(id)) {
          // Keep selection
        } else {
          store.setSelection({ type: 'node', id });
        }
      }
    } else if (edgeEl) {
      const id = edgeEl.getAttribute('data-id');
      if (id) {
        store.setSelection({ type: 'edge', id });
      }
    } else {
      store.setSelection(null);
    }

    const sceneCoords = toScene(e.clientX, e.clientY);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sceneX: sceneCoords.x,
      sceneY: sceneCoords.y
    });
  }, [presenting, toScene, store]);

  // ── Fit-view trigger from TopBar ──
  const { fitViewTrigger } = store;
  useEffect(() => { if (fitViewTrigger > 0) fitView(); }, [fitViewTrigger, fitView]);

  // ── Node inline editor ──
  const handleNodeDoubleClick = useCallback((id: string) => {
    if (presenting) return;
    // Prevent the onBlur guard from closing the editor the instant it opens.
    // Click events still in-flight after the double-click briefly steal focus;
    // this 350 ms window lets the editor settle before we honour any blur.
    justOpenedNodeEditorRef.current = true;
    window.setTimeout(() => { justOpenedNodeEditorRef.current = false; }, 350);
    const node = nodes.find(n => n.id === id);
    if (node) {
      initialNodeHeightRef.current = node.h;
    }
    setEditingNodeId(id);
    store.setSelection({ type: 'node', id });
  }, [presenting, nodes, store]);

  useEffect(() => {
    if (!editingNodeId || !editorRef.current) return;
    const node = nodes.find(n => n.id === editingNodeId);
    if (!node) return;
    editorRef.current.innerHTML = node.labelHtml ?? node.label;
    editorRef.current.focus();
    document.execCommand('selectAll', false);
  }, [editingNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNodeEdit = useCallback(() => {
    if (!editingNodeId || !editorRef.current) return;
    const node = store.nodes.find(n => n.id === editingNodeId);
    if (node && node.labelHtml !== editorRef.current.innerHTML) {
      store.pushToUndo();
      store.updateNode(editingNodeId, { labelHtml: editorRef.current.innerHTML });
    }
    setEditingNodeId(null);
  }, [editingNodeId, store]);

  const execNodeFmt = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }, []);

  // ── Edge label inline editor ──
  const handleEdgeLabelDoubleClick = useCallback((edgeId: string, sceneX: number, sceneY: number) => {
    if (presenting) return;
    const edge = store.edges.find(e => e.id === edgeId);
    if (!edge) return;
    store.setSelection({ type: 'edge', id: edgeId });
    setEditingEdgeLabelId(edgeId);
    setEditingEdgeLabelPos({ x: pan.x + sceneX * zoom, y: pan.y + sceneY * zoom });
  }, [presenting, store, pan, zoom]);

  useEffect(() => {
    if (!editingEdgeLabelId || !edgeLabelRef.current) return;
    const edge = store.edges.find(e => e.id === editingEdgeLabelId);
    if (!edge) return;
    edgeLabelRef.current.value = edge.label ?? '';
    edgeLabelRef.current.focus();
    edgeLabelRef.current.select();
  }, [editingEdgeLabelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveEdgeLabel = useCallback(() => {
    if (!editingEdgeLabelId || !edgeLabelRef.current) return;
    const edge = store.edges.find(e => e.id === editingEdgeLabelId);
    const newVal = edgeLabelRef.current.value.trim() || undefined;
    if (edge && edge.label !== newVal) {
      store.updateEdge(editingEdgeLabelId, { label: newVal });
    }
    setEditingEdgeLabelId(null);
  }, [editingEdgeLabelId, store]);

  // ── HTML5 drop ──
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('nodeType');
    if (!type) return;
    const sc = toScene(e.clientX, e.clientY);
    store.addNode(type, sc.x - 65, sc.y - 28);
  }, [toScene, store]);

  // ── Laser trail: animation loop (fading from tail, drawing to canvas) ──
  const TRAIL_LIFETIME = 950; // ms a point lives (shorter lifetime for a smaller, cleaner tail)
  const tickTrail = useCallback(() => {
    const trail = laserTrailRef.current;
    const now = performance.now();

    // Remove expired points from the front
    while (trail.length > 0 && now - trail[0].t > TRAIL_LIFETIME) {
      trail.shift();
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Match canvas physical dimensions to client dimensions
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
        } else {
          ctx.clearRect(0, 0, rect.width, rect.height);
        }

        if (trail.length > 1) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Helper to draw the path utilizing quadratic curves for extreme smoothness
          const drawPath = (styleFn: (ratio: number) => { width: number; color: string }) => {
            if (trail.length === 2) {
              const ratio = 1 - Math.max(0, Math.min(1, (now - (trail[0].t + trail[1].t) / 2) / TRAIL_LIFETIME));
              const style = styleFn(ratio);
              ctx.beginPath();
              ctx.moveTo(trail[0].x, trail[0].y);
              ctx.lineTo(trail[1].x, trail[1].y);
              ctx.strokeStyle = style.color;
              ctx.lineWidth = style.width;
              ctx.stroke();
              return;
            }

            // 1. First segment (tapered tail start)
            {
              const ratio = 1 - Math.max(0, Math.min(1, (now - (trail[0].t + trail[1].t) / 2) / TRAIL_LIFETIME));
              const style = styleFn(ratio);
              ctx.beginPath();
              ctx.moveTo(trail[0].x, trail[0].y);
              const midX = (trail[0].x + trail[1].x) / 2;
              const midY = (trail[0].y + trail[1].y) / 2;
              ctx.lineTo(midX, midY);
              ctx.strokeStyle = style.color;
              ctx.lineWidth = style.width;
              ctx.stroke();
            }

            // 2. Middle segments (smooth quadratic curves)
            for (let i = 1; i < trail.length - 1; i++) {
              const p0 = trail[i - 1];
              const p1 = trail[i];
              const p2 = trail[i + 1];
              
              const ratio = 1 - Math.max(0, Math.min(1, (now - p1.t) / TRAIL_LIFETIME));
              const style = styleFn(ratio);
              
              const prevMidX = (p0.x + p1.x) / 2;
              const prevMidY = (p0.y + p1.y) / 2;
              const nextMidX = (p1.x + p2.x) / 2;
              const nextMidY = (p1.y + p2.y) / 2;
              
              ctx.beginPath();
              ctx.moveTo(prevMidX, prevMidY);
              ctx.quadraticCurveTo(p1.x, p1.y, nextMidX, nextMidY);
              ctx.strokeStyle = style.color;
              ctx.lineWidth = style.width;
              ctx.stroke();
            }

            // 3. Last segment (connecting to cursor position)
            {
              const len = trail.length;
              const ratio = 1 - Math.max(0, Math.min(1, (now - (trail[len - 2].t + trail[len - 1].t) / 2) / TRAIL_LIFETIME));
              const style = styleFn(ratio);
              ctx.beginPath();
              const midX = (trail[len - 2].x + trail[len - 1].x) / 2;
              const midY = (trail[len - 2].y + trail[len - 1].y) / 2;
              ctx.moveTo(midX, midY);
              ctx.lineTo(trail[len - 1].x, trail[len - 1].y);
              ctx.strokeStyle = style.color;
              ctx.lineWidth = style.width;
              ctx.stroke();
            }
          };

          // Draw single neon-red trail pass (tapered to thin line at the tail, high opacity)
          drawPath((ratio) => ({
            width: 1.0 + 3.5 * ratio,
            color: `rgba(255, 42, 95, ${ratio * 0.95})`
          }));
        }
      }
    }

    if (laserDrawingRef.current || trail.length > 0) {
      laserRafRef.current = requestAnimationFrame(tickTrail);
    }
  }, []);

  // ── Laser: track position ──
  const onWrapMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!presenting || !laserMode) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLaserPos({ x, y });
  }, [presenting, laserMode]);

  // ── Laser: click ripple + start drawing trail ──
  const onWrapMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!presenting || !laserMode) return;
    if ((e.target as Element).closest('.present-overlay, .present-topbar')) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const id   = ++rippleIdRef.current;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 1100);

    // Initialize laser trail drawing
    laserDrawingRef.current = true;
    laserTrailRef.current = [{ x, y, t: performance.now() }];
    cancelAnimationFrame(laserRafRef.current);
    laserRafRef.current = requestAnimationFrame(tickTrail);
  }, [presenting, laserMode, tickTrail]);

  // ── Laser: global mousemove while drawing (captures fast drags reliably) ──
  useEffect(() => {
    if (!presenting || !laserMode) return;
    const handleMove = (e: MouseEvent) => {
      if (!laserDrawingRef.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      laserTrailRef.current.push({ x, y, t: performance.now() });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [presenting, laserMode]);

  // ── Laser: stop drawing on mouse up ──
  useEffect(() => {
    if (!presenting || !laserMode) return;
    const handleUp = () => {
      laserDrawingRef.current = false;
    };
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [presenting, laserMode]);

  // Cleanup trail animation on unmount or mode change
  useEffect(() => {
    return () => {
      cancelAnimationFrame(laserRafRef.current);
      laserTrailRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [presenting, laserMode]);

  const cursorClass = tool === 'pan' ? 'pan-mode' : '';
  const laserClass  = presenting && laserMode ? ' laser-mode' : '';

  const editingNode = editingNodeId ? nodes.find(n => n.id === editingNodeId) ?? null : null;

  return (
    <div
      ref={wrapRef}
      className={`canvas-wrap ${cursorClass}${laserClass}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseMove={onWrapMouseMove}
      onMouseDown={onWrapMouseDown}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        if (!presenting) {
          if (e.detail > 1) return;
          if (justOpenedNodeEditorRef.current) return;
          if (editingNodeId)      saveNodeEdit();
          if (editingEdgeLabelId) saveEdgeLabel();
        }
      }}
    >
      {!presenting && <div className="canvas-floor"/>}

      <svg
        id="vizen-svg-canvas"
        ref={svgRef}
        className="canvas-svg"
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* ── Snap alignment guides ── */}
          {snapGuides.guideX !== undefined && (
            <line x1={snapGuides.guideX} y1={-9999} x2={snapGuides.guideX} y2={9999}
                  stroke="#7b9fff" strokeWidth={1 / zoom} strokeDasharray={`${6/zoom} ${4/zoom}`}
                  opacity={0.55} style={{ pointerEvents: 'none' }}/>
          )}
          {snapGuides.guideY !== undefined && (
            <line x1={-9999} y1={snapGuides.guideY} x2={9999} y2={snapGuides.guideY}
                  stroke="#7b9fff" strokeWidth={1 / zoom} strokeDasharray={`${6/zoom} ${4/zoom}`}
                  opacity={0.55} style={{ pointerEvents: 'none' }}/>
          )}
          {edges.map(e => (
            <CanvasEdge key={e.id} edge={e} nodes={nodes}
                        flow={flowMap.get(e.id)}
                        selected={!presenting && selection?.type === 'edge' && selection.id === e.id}
                        onSelect={() => !presenting && store.setSelection({ type: 'edge', id: e.id })}
                        onLabelDoubleClick={handleEdgeLabelDoubleClick}
                        onEndpointDragStart={handleEndpointDragStart}/>
          ))}
          {draft && <ConnectionDraftLine draft={draft} nodes={nodes} mouseXY={mouseXY}/>}
          {/* Rect-select rubber band */}
          {rectSelect && (() => {
            const { sx, sy, ex, ey } = rectSelect;
            const rx = Math.min(sx, ex), ry = Math.min(sy, ey);
            const rw = Math.abs(ex - sx),  rh = Math.abs(ey - sy);
            return (
              <rect x={rx} y={ry} width={rw} height={rh}
                    fill="rgba(123,159,255,0.07)" stroke="#7b9fff"
                    strokeWidth={1 / zoom} strokeDasharray={`${4/zoom} ${3/zoom}`}
                    style={{ pointerEvents: 'none' }}/>
            );
          })()}
          {reconnect && (() => {
            const rx1 = reconnect.fixedX, ry1 = reconnect.fixedY;
            const rx2 = mouseXY.x,        ry2 = mouseXY.y;
            const mx  = (rx1 + rx2) / 2;
            const rd  = `M${rx1},${ry1} C${mx},${ry1} ${mx},${ry2} ${rx2},${ry2}`;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <path d={rd} fill="none" stroke="#7b9fff" strokeWidth={1.5}
                      strokeDasharray="5 3" strokeLinecap="round" opacity={0.7}/>
                <circle cx={rx2} cy={ry2} r={4} fill="#7b9fff" opacity={0.8}
                        style={{ filter: 'drop-shadow(0 0 4px #7b9fff)' }}/>
              </g>
            );
          })()}
          {/* Multi-selection group bounding box & drag handle overlay */}
          {!presenting && selection?.type === 'multi' && selection.ids.length > 0 && (() => {
            const selectedNodes = nodes.filter(n => selection.ids.includes(n.id));
            if (selectedNodes.length === 0) return null;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            selectedNodes.forEach(n => {
              if (n.x < minX) minX = n.x;
              if (n.y < minY) minY = n.y;
              if (n.x + n.w > maxX) maxX = n.x + n.w;
              if (n.y + n.h > maxY) maxY = n.y + n.h;
            });

            const pad = 12;
            const gx = minX - pad;
            const gy = minY - pad;
            const gw = (maxX - minX) + pad * 2;
            const gh = (maxY - minY) + pad * 2;

            const firstGroupId = selectedNodes[0]?.groupId;
            const isGrouped = firstGroupId && selectedNodes.every(n => n.groupId === firstGroupId);

            const handleGroupOverlayPointerDown = (e: React.PointerEvent) => {
              if (tool === 'pan') return;
              e.stopPropagation();
              const sc = toScene(e.clientX, e.clientY);
              const origins: Record<string, { x: number; y: number }> = {};
              selection.ids.forEach(id => {
                const n = nodes.find(item => item.id === id);
                if (n) origins[id] = { x: n.x, y: n.y };
              });

              pendingNodeDragRef.current = {
                pointerId: e.pointerId,
                nodeId: selection.ids[0],
                startClientX: e.clientX,
                startClientY: e.clientY,
                startX: sc.x,
                startY: sc.y,
                nodeIds: [...selection.ids],
                origins,
                isShift: e.shiftKey || e.ctrlKey || e.metaKey,
                wasAlreadySelected: true,
              };
            };

            return (
              <g className="multi-selection-group-overlay">
                <rect
                  x={gx} y={gy} width={gw} height={gh} rx={10}
                  fill="rgba(123, 159, 255, 0.05)"
                  stroke="#7b9fff"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                  style={{ cursor: tool === 'select' ? 'move' : 'inherit', pointerEvents: 'all' }}
                  onPointerDown={handleGroupOverlayPointerDown}
                />
                <g transform={`translate(${gx}, ${gy - 24 / zoom})`} style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={handleGroupOverlayPointerDown}>
                  <rect
                    x={0} y={0} width={Math.max(120, (isGrouped ? 130 : 120) / zoom)} height={20 / zoom} rx={4 / zoom}
                    fill="#7b9fff"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                  />
                  <text
                    x={6 / zoom} y={14 / zoom}
                    fill="#0c101c"
                    fontSize={11 / zoom}
                    fontWeight="bold"
                    fontFamily="DM Sans, sans-serif"
                  >
                    {isGrouped ? `📦 Group (${selectedNodes.length})` : `🏷️ ${selectedNodes.length} Selected`}
                  </text>
                </g>
              </g>
            );
          })()}
          {nodes.map(n => (
            <CanvasNode key={n.id} node={n}
                        active={lit.has(n.id)}
                        selected={!presenting && (
                          (selection?.type === 'node'  && selection.id === n.id) ||
                          (selection?.type === 'multi' && selection.ids.includes(n.id))
                        )}
                        tool={presenting ? 'pan' : tool}
                        onSelect={() => !presenting && store.setSelection({ type: 'node', id: n.id })}
                        editing={editingNodeId === n.id}
                        onDragStart={handleNodeDragStart}
                        onPortDragStart={handlePortDragStart}
                        onDoubleClick={handleNodeDoubleClick}
                        onResizeStart={handleResizeStart}/>
          ))}
        </g>
      </svg>

      {/* ── Node inline editor (overlays the node body) ── */}
      {editingNode && (() => {
        const c   = ACCENT_COLORS[editingNode.accent] ?? ACCENT_COLORS.neutral;
        const sx  = pan.x + editingNode.x * zoom;
        const sy  = pan.y + editingNode.y * zoom;
        const sw  = editingNode.w * zoom;
        const sh  = editingNode.h * zoom;
        const br  = (editingNode.big ? 12 : 9) * zoom;
        const fs  = Math.max(10, (editingNode.big ? 12 : 11) * zoom);
        return (
          <div
            className="nie-wrap"
            style={{ left: sx, top: sy, width: sw }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Toolbar floating above the node */}
            <div className="nie-toolbar" onMouseDown={e => e.preventDefault()}>
              <FormatBar onFmt={execNodeFmt} extended/>
              <span className="nie-hint-kbd">Esc · Ctrl+↵</span>
            </div>
            {/* Editor body — transparent, overlays the node visual */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="nie-body"
              style={{
                height: sh,
                borderRadius: br,
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: c.color,
                fontSize: fs,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingLeft: 10 * zoom,
                paddingRight: 10 * zoom,
                paddingTop: editingNode.big ? 10 * zoom : 0,
                paddingBottom: 0,
                boxSizing: 'border-box',
              }}
              onInput={() => {
                if (!editorRef.current) return;
                const el = editorRef.current;
                const prevHeight = el.style.height;
                el.style.height = 'auto';
                const contentH = el.scrollHeight;
                el.style.height = prevHeight;
                const sceneH = Math.max(initialNodeHeightRef.current, Math.ceil(contentH / zoom) + 4);
                store.updateNode(editingNode.id, { h: sceneH });
              }}
              onBlur={() => {
                if (justOpenedNodeEditorRef.current) {
                  // Editor just opened — spurious blur from the same gesture.
                  // Re-claim focus on the next frame instead of saving/closing.
                  requestAnimationFrame(() => editorRef.current?.focus());
                  return;
                }
                saveNodeEdit();
              }}
              onKeyDown={e => {
                if (e.key === 'Escape')                             { e.preventDefault(); saveNodeEdit(); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveNodeEdit(); }
              }}
            />
          </div>
        );
      })()}

      {/* ── Edge label inline editor ── */}
      {editingEdgeLabelId && (
        <div
          style={{ position: 'absolute', left: editingEdgeLabelPos.x, top: editingEdgeLabelPos.y, transform: 'translate(-50%,-50%)', zIndex: 60 }}
          onClick={e => e.stopPropagation()}
        >
          <input
            ref={edgeLabelRef}
            className="edge-label-input"
            placeholder="Label…"
            onBlur={saveEdgeLabel}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); saveEdgeLabel(); }
              if (e.key === 'Escape') { e.preventDefault(); setEditingEdgeLabelId(null); }
            }}
          />
        </div>
      )}

      {/* Tool palette and zoom bar have moved to TopBar */}

      {/* ── Present: step description at TOP ── */}
      {presenting && step && !!step.desc && (
        <div className="present-topbar">
          <div
            key={stepIdx}
            className="present-topbar-desc"
            dangerouslySetInnerHTML={{ __html: step.desc }}
          />
        </div>
      )}

      {/* ── Present: bottom controls ── */}
      {presenting && step && (
        <div className="present-overlay">
          <button className="btn"
                  onClick={() => store.setStepIdx(Math.max(0, stepIdx - 1))}
                  disabled={stepIdx === 0}>
            ← Prev
          </button>
          <span className="present-step-counter">{stepIdx + 1} / {steps.length}</span>
          <button className="btn primary"
                  onClick={() => store.setStepIdx(Math.min(steps.length - 1, stepIdx + 1))}
                  disabled={stepIdx === steps.length - 1}>
            Next →
          </button>
          <div className="present-ctrl-div"/>
          <button
            className={`icon-btn ${laserMode ? 'active' : ''}`}
            title={laserMode ? 'Switch to cursor' : 'Laser pointer'}
            onClick={() => setLaserMode(v => !v)}
          >
            {laserMode ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" fill="currentColor"/>
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                <path d="M8 1v2.5M8 12.5v2.5M1 8h2.5M12.5 8h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            ) : (
              <IcCursor size={14}/>
            )}
          </button>
        </div>
      )}

      {/* ── Laser trail Canvas ── */}
      {presenting && laserMode && (
        <canvas
          ref={canvasRef}
          className="laser-trail-canvas"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 38
          }}
        />
      )}

      {/* ── Laser dot ── */}
      {presenting && laserMode && (
        <div className="laser-dot" style={{ left: laserPos.x, top: laserPos.y }}/>
      )}

      {/* ── Laser click ripples ── */}
      {ripples.map(r => (
        <div key={r.id} className="laser-ripple" style={{ left: r.x, top: r.y }}/>
      ))}

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={e => e.preventDefault()}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            disabled={!selection}
            onClick={() => { if (selection) { store.copySelection(); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </div>
            <span className="context-menu-kbd">Ctrl+C</span>
          </button>

          <button
            className="context-menu-item"
            disabled={!selection}
            onClick={() => { if (selection) { store.cutSelection(); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
              <span>Cut</span>
            </div>
            <span className="context-menu-kbd">Ctrl+X</span>
          </button>

          <button
            className="context-menu-item"
            disabled={!clipboard}
            onClick={() => { if (clipboard) { store.pasteSelection({ x: contextMenu.sceneX, y: contextMenu.sceneY }); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              <span>Paste</span>
            </div>
            <span className="context-menu-kbd">Ctrl+V</span>
          </button>

          <button
            className="context-menu-item"
            disabled={!selection}
            onClick={() => { if (selection) { store.duplicateSelection(); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="12" height="12" rx="2" ry="2"/><rect x="9" y="3" width="12" height="12" rx="2" ry="2"/></svg>
              <span>Duplicate</span>
            </div>
            <span className="context-menu-kbd">Ctrl+D</span>
          </button>

          {selection && selection.type === 'multi' && selection.ids.length > 1 && (
            <button
              className="context-menu-item"
              onClick={() => { store.groupSelection(); setContextMenu(null); }}
            >
              <div className="context-menu-item-left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                <span>Group Selection</span>
              </div>
              <span className="context-menu-kbd">Ctrl+G</span>
            </button>
          )}

          {selection && (() => {
            const selectedNodes = nodes.filter(n =>
              selection.type === 'node' ? n.id === selection.id :
              selection.type === 'multi' ? selection.ids.includes(n.id) : false
            );
            const isGrouped = selectedNodes.some(n => n.groupId);
            if (!isGrouped) return null;
            return (
              <button
                className="context-menu-item"
                onClick={() => { store.ungroupSelection(); setContextMenu(null); }}
              >
                <div className="context-menu-item-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                  <span>Ungroup Selection</span>
                </div>
                <span className="context-menu-kbd">Ctrl+Shift+G</span>
              </button>
            );
          })()}

          <div className="context-menu-sep" />

          <button
            className="context-menu-item"
            disabled={!selection || selection.type === 'edge'}
            onClick={() => { if (selection) { store.bringToFront(); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span>Bring to Front</span>
            </div>
          </button>

          <button
            className="context-menu-item"
            disabled={!selection || selection.type === 'edge'}
            onClick={() => { if (selection) { store.sendToBack(); } setContextMenu(null); }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><line x1="2" y1="17" x2="22" y2="17"/><line x1="2" y1="22" x2="22" y2="22"/></svg>
              <span>Send to Back</span>
            </div>
          </button>

          <div className="context-menu-sep" />

          <button
            className="context-menu-item"
            disabled={!selection}
            style={{ color: 'var(--accent-coral)' }}
            onClick={() => {
              if (selection) {
                if (selection.type === 'node') store.deleteNode(selection.id);
                else if (selection.type === 'edge') store.deleteEdge(selection.id);
                else if (selection.type === 'multi') store.deleteNodes(selection.ids);
              }
              setContextMenu(null);
            }}
          >
            <div className="context-menu-item-left">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-coral)' }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>Delete</span>
            </div>
            <span className="context-menu-kbd" style={{ color: 'var(--accent-coral)', opacity: 0.8 }}>Del</span>
          </button>
        </div>
      )}
    </div>
  );
}

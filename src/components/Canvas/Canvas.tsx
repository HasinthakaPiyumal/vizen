import { useRef, useState, useCallback, useEffect } from 'react';
import { useDiagramStore, TYPE_COLORS_MAP, ACCENT_COLORS } from '../../store/useDiagramStore';
import { CanvasNode } from './CanvasNode';
import { CanvasEdge } from './CanvasEdge';
import { ConnectionDraftLine } from './ConnectionDraft';
import type { ConnectionDraft, DiagramNode, ResizeHandle } from '../../types';
import { IcCursor } from '../Icons';

interface DragState    { nodeId: string; startX: number; startY: number; originX: number; originY: number }
interface Ripple       { id: number; x: number; y: number }
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
  const { nodes, edges, steps, stepIdx, selection, tool, zoom, pan } = store;
  const step    = steps[stepIdx];
  const lit     = new Set(step?.lit ?? []);
  const flowMap = new Map((step?.flows ?? []).map(f => [f.edgeId, f]));

  const wrapRef      = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const editorRef    = useRef<HTMLDivElement>(null);
  const edgeLabelRef = useRef<HTMLInputElement>(null);
  const rippleIdRef  = useRef(0);
  const prevViewRef  = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  const [nodeDrag,    setNodeDrag]    = useState<DragState | null>(null);
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

  // ── Auto-fit on first mount ──
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current || !wrapRef.current || !nodes.length) return;
    hasFit.current = true;
    const t = setTimeout(() => {
      const rect = wrapRef.current!.getBoundingClientRect();
      const pad = 72;
      const xs = nodes.map(n => n.x), xe = nodes.map(n => n.x + n.w);
      const ys = nodes.map(n => n.y), ye = nodes.map(n => n.y + n.h);
      const minX = Math.min(...xs), maxX = Math.max(...xe);
      const minY = Math.min(...ys), maxY = Math.max(...ye);
      const sceneW = maxX - minX, sceneH = maxY - minY;
      const z = Math.min((rect.width - pad * 2) / sceneW, (rect.height - pad * 2) / sceneH, 1.2);
      store.setZoom(z);
      store.setPan({ x: (rect.width - sceneW * z) / 2 - minX * z, y: (rect.height - sceneH * z) / 2 - minY * z });
    }, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ── Native wheel: scroll=pan, ctrl/pinch=zoom ──
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: z, pan: p, setZoom, setPan } = useDiagramStore.getState();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const newZ = Math.max(0.15, Math.min(4, z * factor));
        setZoom(newZ);
        setPan({ x: mx - (mx - p.x) * (newZ / z), y: my - (my - p.y) * (newZ / z) });
      } else {
        setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
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
    if (!nodes.length || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const pad = 64;
    const xs = nodes.map(n => n.x), xe = nodes.map(n => n.x + n.w);
    const ys = nodes.map(n => n.y), ye = nodes.map(n => n.y + n.h);
    const minX = Math.min(...xs), maxX = Math.max(...xe);
    const minY = Math.min(...ys), maxY = Math.max(...ye);
    const sceneW = maxX - minX, sceneH = maxY - minY;
    const z = Math.min((rect.width - pad * 2) / sceneW, (rect.height - pad * 2) / sceneH, 1.5);
    store.setZoom(z);
    store.setPan({ x: (rect.width - sceneW * z) / 2 - minX * z, y: (rect.height - sceneH * z) / 2 - minY * z });
  }, [nodes, store]);

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

    // ── Move node with alignment snap ──
    if (nodeDrag) {
      const SNAP = 8;
      let nx = nodeDrag.originX + (sc.x - nodeDrag.startX);
      let ny = nodeDrag.originY + (sc.y - nodeDrag.startY);
      const state = useDiagramStore.getState();
      const mv = state.nodes.find(n => n.id === nodeDrag.nodeId);
      if (mv) {
        const others = state.nodes.filter(n => n.id !== nodeDrag.nodeId);
        let guideX: number|undefined, guideY: number|undefined;
        let bdx = SNAP, bdy = SNAP;
        for (const o of others) {
          for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) {
            for (const off of [0, mv.w / 2, mv.w]) {
              const d = Math.abs((nx + off) - ox);
              if (d < bdx) { bdx = d; nx = ox - off; guideX = ox; }
            }
          }
          for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) {
            for (const off of [0, mv.h / 2, mv.h]) {
              const d = Math.abs((ny + off) - oy);
              if (d < bdy) { bdy = d; ny = oy - off; guideY = oy; }
            }
          }
        }
        setSnapGuides({ guideX, guideY });
      }
      store.updateNode(nodeDrag.nodeId, { x: nx, y: ny });
    }
  }, [presenting, panDrag, rectSelect, resizeDrag, nodeDrag, toScene, store]);

  const onSvgPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
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
    if (resizeDrag) { setResizeDrag(null); setPanDrag(null); setNodeDrag(null); return; }

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
    (svgRef.current as Element | null)?.setPointerCapture?.(e.pointerId);
    if (onBorder) {
      setDraft({ fromId: id, fromPort: nearestPort(node, sc.x, sc.y), x: sc.x, y: sc.y });
    } else {
      setNodeDrag({ nodeId: id, startX: sc.x, startY: sc.y, originX: node.x, originY: node.y });
    }
  }, [presenting, nodes, toScene]);

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
    setResizeDrag({ nodeId: id, handle, startSX: sc.x, startSY: sc.y, origX: node.x, origY: node.y, origW: node.w, origH: node.h });
  }, [presenting, store, toScene]);

  // ── Keyboard: delete, tool shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (document.activeElement?.tagName === 'INPUT') return;

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
      else if (selection.type === 'multi') selection.ids.forEach(id => store.deleteNode(id));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  // ── Fit-view trigger from TopBar ──
  const { fitViewTrigger } = store;
  useEffect(() => { if (fitViewTrigger > 0) fitView(); }, [fitViewTrigger, fitView]);

  // ── Node inline editor ──
  const handleNodeDoubleClick = useCallback((id: string) => {
    if (presenting) return;
    setEditingNodeId(id);
    store.setSelection({ type: 'node', id });
  }, [presenting, store]);

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
    store.updateNode(editingNodeId, { labelHtml: editorRef.current.innerHTML });
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
    store.updateEdge(editingEdgeLabelId, { label: edgeLabelRef.current.value.trim() || undefined });
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

  // ── Laser: track position ──
  const onWrapMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!presenting || !laserMode) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [presenting, laserMode]);

  // ── Laser: click ripple ──
  const onWrapMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!presenting || !laserMode) return;
    if ((e.target as Element).closest('.present-overlay, .present-topbar')) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const id   = ++rippleIdRef.current;
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 650);
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
      onClick={(e) => {
        if (!presenting) {
          if (e.detail > 1) return;
          if (editingNodeId)      saveNodeEdit();
          if (editingEdgeLabelId) saveEdgeLabel();
        }
      }}
    >
      <div className="canvas-floor"/>

      <svg
        ref={svgRef}
        className="canvas-svg"
        onPointerDown={onSvgPointerDown}
        onPointerMove={onSvgPointerMove}
        onPointerUp={onSvgPointerUp}
        onDoubleClick={(e) => {
          if (presenting) return;
          const sc = toScene(e.clientX, e.clientY);
          // Hit-test: find the topmost node containing this point
          const state = useDiagramStore.getState();
          // Iterate in reverse so topmost (last-rendered) node wins
          for (let i = state.nodes.length - 1; i >= 0; i--) {
            const nd = state.nodes[i];
            if (sc.x >= nd.x && sc.x <= nd.x + nd.w && sc.y >= nd.y && sc.y <= nd.y + nd.h) {
              handleNodeDoubleClick(nd.id);
              return;
            }
          }
        }}
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
            {/* Editor body — matches node visual */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="nie-body"
              style={{
                minHeight: sh,
                borderRadius: br,
                background: c.fill,
                border: `1.5px solid ${c.edge}`,
                color: c.color,
                fontSize: fs,
                paddingTop: editingNode.big ? Math.max(8, 14 * zoom) : 8,
              }}
              onInput={() => {
                if (!editorRef.current) return;
                const el = editorRef.current;
                el.style.minHeight = '0';
                const contentH = el.scrollHeight;
                el.style.minHeight = '';
                const sceneH = Math.max(36, Math.ceil(contentH / zoom) + 12);
                store.updateNode(editingNode.id, { h: sceneH });
              }}
              onBlur={saveNodeEdit}
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

      {/* ── Laser dot ── */}
      {presenting && laserMode && (
        <div className="laser-dot" style={{ left: laserPos.x, top: laserPos.y }}/>
      )}

      {/* ── Laser click ripples ── */}
      {ripples.map(r => (
        <div key={r.id} className="laser-ripple" style={{ left: r.x, top: r.y }}/>
      ))}
    </div>
  );
}

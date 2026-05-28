import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiagramNode, DiagramEdge, Step, Selection, Tool, FlowEntry, ConnectionDraft, Snapshot, ClipboardData } from '../types';
import { SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_STEPS, NEW_STEP_TEMPLATE } from '../data/sampleDiagram';

let _nodeCounter = 100;
let _edgeCounter = 100;
const uid = (prefix: string) => `${prefix}_${Date.now()}_${++_nodeCounter}`;
const eid = () => `edge_${Date.now()}_${++_edgeCounter}`;

// Accent defaults per node type
const TYPE_ACCENT: Record<string, string> = {
  rect: 'neutral', circle: 'neutral', diamond: 'neutral', text: 'neutral',
  mamba: 'blue', transformer: 'blue', embedding: 'violet', dataset: 'mint', loss: 'coral',
};
const TYPE_COLORS: Record<string, string> = {
  mamba: '#7b9fff', transformer: '#7b9fff', embedding: '#a78bfa',
  dataset: '#34d399', loss: '#f87171', rect: '#94a3b8', circle: '#94a3b8',
  diamond: '#94a3b8', text: '#94a3b8',
};
const TYPE_SUBS: Record<string, string> = {
  rect: 'rectangle', circle: 'ellipse', diamond: 'diamond', text: 'text node',
  mamba: 'SSM Block', transformer: 'Attention', embedding: 'Latent', dataset: 'Data source', loss: 'Criterion',
};

interface DiagramState {
  // Persisted
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: Step[];
  stepIdx: number;

  // Ephemeral UI
  selection: Selection;
  tool: Tool;
  zoom: number;
  pan: { x: number; y: number };
  playing: boolean;
  draft: ConnectionDraft | null;
  past: Snapshot[];
  future: Snapshot[];
  clipboard: ClipboardData | null;

  // Node actions
  addNode: (type: string, x: number, y: number) => void;
  updateNode: (id: string, patch: Partial<DiagramNode>) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;

  // Edge actions
  addEdge: (from: string, to: string, color: string) => void;
  updateEdge: (id: string, patch: Partial<DiagramEdge>) => void;
  deleteEdge: (id: string) => void;

  // Step actions
  updateStep: (idx: number, fn: (s: Step) => Step) => void;
  updateAllSteps: (fn: (s: Step) => Step) => void;
  addStep: () => void;
  deleteStep: () => void;

  // UI actions
  setTitle: (t: string) => void;
  setStepIdx: (i: number) => void;
  setPlaying: (b: boolean) => void;
  setSelection: (s: Selection) => void;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  setDraft: (d: ConnectionDraft | null) => void;
  resetDiagram: () => void;
  fitViewTrigger: number;
  triggerFitView: () => void;

  // History & Clipboard actions
  undo: () => void;
  redo: () => void;
  pushToUndo: () => void;
  pushSnapshotToUndo: (snapshot: Snapshot) => void;
  getSnapshot: () => Snapshot;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: (atPosition?: { x: number; y: number }) => void;
  duplicateSelection: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set, get) => ({
      // Initial state (loaded from localStorage or sample)
      title: 'Vizen Onboarding',
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      steps: SAMPLE_STEPS,
      stepIdx: 0,

      // Ephemeral (not persisted, always starts fresh)
      selection: null,
      tool: 'select',
      zoom: 1,
      pan: { x: 0, y: 0 },
      playing: false,
      draft: null,
      fitViewTrigger: 0,
      past: [],
      future: [],
      clipboard: null,

      addNode: (type, x, y) => {
        get().pushToUndo();
        const id = uid(type);
        const accent = (TYPE_ACCENT[type] ?? 'blue') as DiagramNode['accent'];
        const node: DiagramNode = {
          id, type, label: type.charAt(0).toUpperCase() + type.slice(1),
          sub: TYPE_SUBS[type] ?? type,
          x, y, w: 130, h: 56, accent,
        };
        set(s => ({ nodes: [...s.nodes, node], selection: { type: 'node', id } }));
      },

      updateNode: (id, patch) => {
        set(s => ({ nodes: s.nodes.map(n => n.id === id ? { ...n, ...patch } : n) }));
      },

      deleteNode: (id) => {
        get().deleteNodes([id]);
      },

      deleteNodes: (ids) => {
        if (ids.length === 0) return;
        get().pushToUndo();
        const idSet = new Set(ids);
        set(s => {
          const deletedEdges = s.edges.filter(e => idSet.has(e.from) || idSet.has(e.to));
          const deletedEdgeIds = new Set(deletedEdges.map(e => e.id));
          return {
            nodes: s.nodes.filter(n => !idSet.has(n.id)),
            edges: s.edges.filter(e => !idSet.has(e.from) && !idSet.has(e.to)),
            steps: s.steps.map(st => ({
              ...st,
              lit: st.lit.filter(l => !idSet.has(l)),
              flows: st.flows.filter(f => !deletedEdgeIds.has(f.edgeId)),
            })),
            selection: null,
          };
        });
      },

      addEdge: (from, to, color) => {
        // Don't duplicate
        const exists = get().edges.some(e => e.from === from && e.to === to);
        if (exists || from === to) return;
        get().pushToUndo();
        const id = eid();
        const edge: DiagramEdge = { id, from, to, defaultColor: color };
        set(s => ({ edges: [...s.edges, edge], selection: { type: 'edge', id } }));
      },

      updateEdge: (id, patch) => {
        get().pushToUndo();
        set(s => ({ edges: s.edges.map(e => e.id === id ? { ...e, ...patch } : e) }));
      },

      deleteEdge: (id) => {
        get().pushToUndo();
        set(s => ({
          edges: s.edges.filter(e => e.id !== id),
          steps: s.steps.map(st => ({ ...st, flows: st.flows.filter(f => f.edgeId !== id) })),
          selection: null,
        }));
      },

      updateStep: (idx, fn) => {
        get().pushToUndo();
        set(s => ({ steps: s.steps.map((st, i) => i === idx ? fn(st) : st) }));
      },

      updateAllSteps: (fn) => {
        get().pushToUndo();
        set(s => ({ steps: s.steps.map(fn) }));
      },

      addStep: () => {
        get().pushToUndo();
        const { stepIdx, steps } = get();
        const id = `step_${Date.now()}`;
        const newStep: Step = { ...NEW_STEP_TEMPLATE, id, taskName: `Step ${steps.length + 1}` };
        const next = [...steps];
        next.splice(stepIdx + 1, 0, newStep);
        set({ steps: next, stepIdx: stepIdx + 1 });
      },

      deleteStep: () => {
        const { stepIdx, steps } = get();
        if (steps.length <= 1) return;
        get().pushToUndo();
        const next = steps.filter((_, i) => i !== stepIdx);
        set({ steps: next, stepIdx: Math.max(0, Math.min(stepIdx, next.length - 1)) });
      },

      triggerFitView: () => set(s => ({ fitViewTrigger: s.fitViewTrigger + 1 })),
      setTitle: (t) => {
        get().pushToUndo();
        set({ title: t });
      },
      setStepIdx: (i) => set({ stepIdx: i }),
      setPlaying: (b) => set({ playing: b }),
      setSelection: (s) => set({ selection: s }),
      setTool: (t) => set({ tool: t }),
      setZoom: (z) => set({ zoom: Math.max(0.15, Math.min(4, z)) }),
      setPan: (p) => set({ pan: p }),
      setDraft: (d) => set({ draft: d }),
      resetDiagram: () => {
        get().pushToUndo();
        set({
          title: 'Untitled',
          nodes: [], edges: [],
          steps: [{ ...NEW_STEP_TEMPLATE, id: 'step_0', taskName: 'Step 1' }],
          stepIdx: 0, selection: null, playing: false,
        });
      },

      undo: () => {
        const { past, future, title, nodes, edges, steps, stepIdx } = get();
        if (past.length === 0) return;
        const prev = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const current = { title, nodes, edges, steps, stepIdx };
        set({
          past: newPast,
          future: [...future, current],
          title: prev.title,
          nodes: prev.nodes,
          edges: prev.edges,
          steps: prev.steps,
          stepIdx: prev.stepIdx,
          selection: null,
        });
      },

      redo: () => {
        const { past, future, title, nodes, edges, steps, stepIdx } = get();
        if (future.length === 0) return;
        const next = future[future.length - 1];
        const newFuture = future.slice(0, -1);
        const current = { title, nodes, edges, steps, stepIdx };
        set({
          past: [...past, current],
          future: newFuture,
          title: next.title,
          nodes: next.nodes,
          edges: next.edges,
          steps: next.steps,
          stepIdx: next.stepIdx,
          selection: null,
        });
      },

      pushToUndo: () => {
        const { title, nodes, edges, steps, stepIdx } = get();
        const snapshot = JSON.parse(JSON.stringify({ title, nodes, edges, steps, stepIdx }));
        set(s => {
          const newPast = [...s.past, snapshot];
          if (newPast.length > 50) newPast.shift();
          return { past: newPast, future: [] };
        });
      },

      pushSnapshotToUndo: (snapshot) => {
        set(s => {
          const newPast = [...s.past, snapshot];
          if (newPast.length > 50) newPast.shift();
          return { past: newPast, future: [] };
        });
      },

      getSnapshot: () => {
        const { title, nodes, edges, steps, stepIdx } = get();
        return JSON.parse(JSON.stringify({ title, nodes, edges, steps, stepIdx }));
      },

      copySelection: () => {
        const { selection, nodes, edges } = get();
        if (!selection) return;

        let copiedNodes: DiagramNode[] = [];
        let copiedEdges: DiagramEdge[] = [];

        if (selection.type === 'node') {
          const node = nodes.find(n => n.id === selection.id);
          if (node) copiedNodes = [node];
        } else if (selection.type === 'edge') {
          const edge = edges.find(e => e.id === selection.id);
          if (edge) copiedEdges = [edge];
        } else if (selection.type === 'multi') {
          copiedNodes = nodes.filter(n => selection.ids.includes(n.id));
          const nodeIds = new Set(copiedNodes.map(n => n.id));
          copiedEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
        }

        if (copiedNodes.length > 0 || copiedEdges.length > 0) {
          set({
            clipboard: JSON.parse(JSON.stringify({ nodes: copiedNodes, edges: copiedEdges }))
          });
        }
      },

      cutSelection: () => {
        const { selection } = get();
        if (!selection) return;

        get().copySelection();

        if (selection.type === 'node') {
          get().deleteNode(selection.id);
        } else if (selection.type === 'edge') {
          get().deleteEdge(selection.id);
        } else if (selection.type === 'multi') {
          get().deleteNodes(selection.ids);
        }
      },

      pasteSelection: (atPosition) => {
        const { clipboard } = get();
        if (!clipboard) return;

        get().pushToUndo();

        const { nodes: copiedNodes, edges: copiedEdges } = clipboard;
        const idMap: Record<string, string> = {};
        const timestamp = Date.now();
        let pasteNodeCounter = 0;

        const newNodes = copiedNodes.map(node => {
          const newId = `${node.type}_${timestamp}_${++pasteNodeCounter}`;
          idMap[node.id] = newId;
          return { ...node, id: newId };
        });

        if (atPosition && newNodes.length > 0) {
          const xs = newNodes.map(n => n.x), xe = newNodes.map(n => n.x + n.w);
          const ys = newNodes.map(n => n.y), ye = newNodes.map(n => n.y + n.h);
          const minX = Math.min(...xs), maxX = Math.max(...xe);
          const minY = Math.min(...ys), maxY = Math.max(...ye);
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          const dx = atPosition.x - centerX;
          const dy = atPosition.y - centerY;

          newNodes.forEach(n => {
            n.x += dx;
            n.y += dy;
          });
        } else {
          newNodes.forEach(n => {
            n.x += 30;
            n.y += 30;
          });
        }

        let pasteEdgeCounter = 0;
        const newEdges = copiedEdges
          .map(edge => {
            const newFrom = idMap[edge.from];
            const newTo = idMap[edge.to];
            if (newFrom && newTo) {
              const newId = `edge_${timestamp}_${++pasteEdgeCounter}`;
              return { ...edge, id: newId, from: newFrom, to: newTo };
            }
            const { nodes: currentNodes } = get();
            const fromExists = currentNodes.some(n => n.id === edge.from);
            const toExists = currentNodes.some(n => n.id === edge.to);
            if (fromExists && toExists) {
              const newId = `edge_${timestamp}_${++pasteEdgeCounter}`;
              return { ...edge, id: newId };
            }
            return null;
          })
          .filter(Boolean) as DiagramEdge[];

        // Shift clipboard elements for subsequent pastes if no target pos specified
        if (!atPosition) {
          clipboard.nodes.forEach(n => {
            n.x += 30;
            n.y += 30;
          });
        }

        set(s => ({
          nodes: [...s.nodes, ...newNodes],
          edges: [...s.edges, ...newEdges],
          selection: newNodes.length === 1
            ? { type: 'node', id: newNodes[0].id }
            : newNodes.length > 1
              ? { type: 'multi', ids: newNodes.map(n => n.id) }
              : newEdges.length === 1
                ? { type: 'edge', id: newEdges[0].id }
                : null
        }));
      },

      duplicateSelection: () => {
        const { selection, nodes, edges } = get();
        if (!selection) return;

        let copiedNodes: DiagramNode[] = [];
        let copiedEdges: DiagramEdge[] = [];

        if (selection.type === 'node') {
          const node = nodes.find(n => n.id === selection.id);
          if (node) copiedNodes = [node];
        } else if (selection.type === 'edge') {
          const edge = edges.find(e => e.id === selection.id);
          if (edge) copiedEdges = [edge];
        } else if (selection.type === 'multi') {
          copiedNodes = nodes.filter(n => selection.ids.includes(n.id));
          const nodeIds = new Set(copiedNodes.map(n => n.id));
          copiedEdges = edges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
        }

        if (copiedNodes.length === 0 && copiedEdges.length === 0) return;

        get().pushToUndo();

        const timestamp = Date.now();
        let dupNodeCounter = 0;
        const idMap: Record<string, string> = {};

        const newNodes = copiedNodes.map(node => {
          const newId = `${node.type}_${timestamp}_${++dupNodeCounter}`;
          idMap[node.id] = newId;
          return {
            ...node,
            id: newId,
            x: node.x + 30,
            y: node.y + 30,
          };
        });

        let dupEdgeCounter = 0;
        const newEdges = copiedEdges
          .map(edge => {
            const newFrom = idMap[edge.from];
            const newTo = idMap[edge.to];
            if (newFrom && newTo) {
              const newId = `edge_${timestamp}_${++dupEdgeCounter}`;
              return { ...edge, id: newId, from: newFrom, to: newTo };
            }
            const fromExists = nodes.some(n => n.id === edge.from);
            const toExists = nodes.some(n => n.id === edge.to);
            if (fromExists && toExists) {
              const newId = `edge_${timestamp}_${++dupEdgeCounter}`;
              return { ...edge, id: newId };
            }
            return null;
          })
          .filter(Boolean) as DiagramEdge[];

        set(s => ({
          nodes: [...s.nodes, ...newNodes],
          edges: [...s.edges, ...newEdges],
          selection: newNodes.length === 1
            ? { type: 'node', id: newNodes[0].id }
            : newNodes.length > 1
              ? { type: 'multi', ids: newNodes.map(n => n.id) }
              : newEdges.length === 1
                ? { type: 'edge', id: newEdges[0].id }
                : null
        }));
      },

      bringToFront: () => {
        const { selection } = get();
        if (!selection) return;

        let targetIds: string[] = [];
        if (selection.type === 'node') {
          targetIds = [selection.id];
        } else if (selection.type === 'multi') {
          targetIds = selection.ids;
        }

        if (targetIds.length === 0) return;
        get().pushToUndo();

        set(s => {
          const toMove = s.nodes.filter(n => targetIds.includes(n.id));
          const others = s.nodes.filter(n => !targetIds.includes(n.id));
          return {
            nodes: [...others, ...toMove]
          };
        });
      },

      sendToBack: () => {
        const { selection } = get();
        if (!selection) return;

        let targetIds: string[] = [];
        if (selection.type === 'node') {
          targetIds = [selection.id];
        } else if (selection.type === 'multi') {
          targetIds = selection.ids;
        }

        if (targetIds.length === 0) return;
        get().pushToUndo();

        set(s => {
          const toMove = s.nodes.filter(n => targetIds.includes(n.id));
          const others = s.nodes.filter(n => !targetIds.includes(n.id));
          return {
            nodes: [...toMove, ...others]
          };
        });
      },
    }),
    {
      name: 'vizen-diagram',
      partialize: (state) => ({
        title: state.title,
        nodes: state.nodes,
        edges: state.edges,
        steps: state.steps,
        stepIdx: state.stepIdx,
      }),
    }
  )
);

// Helpers used in canvas edge layout
export const ACCENT_COLORS: Record<string, { fill: string; edge: string; color: string; tint: string }> = {
  blue:    { fill: '#0d1830', edge: '#2a4080', color: '#7b9fff', tint: 'rgba(123,159,255,0.45)' },
  violet:  { fill: '#130d1a', edge: '#2d1a3d', color: '#a78bfa', tint: 'rgba(167,139,250,0.45)' },
  mint:    { fill: '#0b1a12', edge: '#1a3d2a', color: '#34d399', tint: 'rgba(52,211,153,0.45)'  },
  green:   { fill: '#0f1a0f', edge: '#1a3d1a', color: '#4ade80', tint: 'rgba(74,222,128,0.45)'  },
  pink:    { fill: '#1a0d18', edge: '#3d1a30', color: '#f472b6', tint: 'rgba(244,114,182,0.45)' },
  coral:   { fill: '#1a0f0f', edge: '#3d1a1a', color: '#f87171', tint: 'rgba(248,113,113,0.45)' },
  amber:   { fill: '#1a1408', edge: '#3d2f10', color: '#fbbf24', tint: 'rgba(251,191,36,0.45)'  },
  neutral: { fill: '#0f1826', edge: '#253450', color: '#94a3b8', tint: 'rgba(255,255,255,0.15)' },
};

export const TYPE_COLORS_MAP = TYPE_COLORS;

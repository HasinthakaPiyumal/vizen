import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiagramNode, DiagramEdge, Step, Selection, Tool, FlowEntry, ConnectionDraft } from '../types';
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

  // Node actions
  addNode: (type: string, x: number, y: number) => void;
  updateNode: (id: string, patch: Partial<DiagramNode>) => void;
  deleteNode: (id: string) => void;

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
}

export const useDiagramStore = create<DiagramState>()(
  persist(
    (set, get) => ({
      // Initial state (loaded from localStorage or sample)
      title: 'HippoCortex',
      nodes: SAMPLE_NODES,
      edges: SAMPLE_EDGES,
      steps: SAMPLE_STEPS,
      stepIdx: 5,

      // Ephemeral (not persisted, always starts fresh)
      selection: null,
      tool: 'select',
      zoom: 1,
      pan: { x: 0, y: 0 },
      playing: false,
      draft: null,
      fitViewTrigger: 0,

      addNode: (type, x, y) => {
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
        set(s => ({
          nodes: s.nodes.filter(n => n.id !== id),
          edges: s.edges.filter(e => e.from !== id && e.to !== id),
          steps: s.steps.map(st => ({
            ...st,
            lit: st.lit.filter(l => l !== id),
            flows: st.flows.filter(f => !s.edges.find(e => e.id === f.edgeId && (e.from === id || e.to === id))),
          })),
          selection: null,
        }));
      },

      addEdge: (from, to, color) => {
        // Don't duplicate
        const exists = get().edges.some(e => e.from === from && e.to === to);
        if (exists || from === to) return;
        const id = eid();
        const edge: DiagramEdge = { id, from, to, defaultColor: color };
        set(s => ({ edges: [...s.edges, edge], selection: { type: 'edge', id } }));
      },

      updateEdge: (id, patch) => {
        set(s => ({ edges: s.edges.map(e => e.id === id ? { ...e, ...patch } : e) }));
      },

      deleteEdge: (id) => {
        set(s => ({
          edges: s.edges.filter(e => e.id !== id),
          steps: s.steps.map(st => ({ ...st, flows: st.flows.filter(f => f.edgeId !== id) })),
          selection: null,
        }));
      },

      updateStep: (idx, fn) => {
        set(s => ({ steps: s.steps.map((st, i) => i === idx ? fn(st) : st) }));
      },

      updateAllSteps: (fn) => {
        set(s => ({ steps: s.steps.map(fn) }));
      },

      addStep: () => {
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
        const next = steps.filter((_, i) => i !== stepIdx);
        set({ steps: next, stepIdx: Math.max(0, Math.min(stepIdx, next.length - 1)) });
      },

      triggerFitView: () => set(s => ({ fitViewTrigger: s.fitViewTrigger + 1 })),
      setTitle: (t) => set({ title: t }),
      setStepIdx: (i) => set({ stepIdx: i }),
      setPlaying: (b) => set({ playing: b }),
      setSelection: (s) => set({ selection: s }),
      setTool: (t) => set({ tool: t }),
      setZoom: (z) => set({ zoom: Math.max(0.15, Math.min(4, z)) }),
      setPan: (p) => set({ pan: p }),
      setDraft: (d) => set({ draft: d }),
      resetDiagram: () => set({
        title: 'Untitled',
        nodes: [], edges: [],
        steps: [{ ...NEW_STEP_TEMPLATE, id: 'step_0', taskName: 'Step 1' }],
        stepIdx: 0, selection: null, playing: false,
      }),
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

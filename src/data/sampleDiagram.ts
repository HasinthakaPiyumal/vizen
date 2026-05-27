import type { DiagramNode, DiagramEdge, Step } from '../types';

export const SAMPLE_NODES: DiagramNode[] = [
  { id: 'input',  type: 'dataset',     label: 'INPUT',         sub: '🐱 Cat · 🐶 Dog', x: 40,  y: 190, w: 115, h: 55, accent: 'amber' },
  { id: 'mamba',  type: 'mamba',       label: 'Mamba',         sub: 'Backbone',        x: 240, y: 178, w: 150, h: 100, accent: 'blue',   big: true, extra: ['Selective SSM · O(N)', 'h_new ∈ ℝᵈ'] },
  { id: 'clf',    type: 'transformer', label: 'Classifier',    sub: 'head',            x: 458, y: 192, w: 106, h: 50, accent: 'neutral' },
  { id: 'loss',   type: 'loss',        label: 'Loss',          sub: 'L_CE',            x: 634, y: 192, w: 80,  h: 50, accent: 'coral' },
  { id: 'proj',   type: 'embedding',   label: 'Null-Space',    sub: 'P = I − UUᵀ',    x: 624, y: 312, w: 148, h: 52, accent: 'pink' },
  { id: 'update', type: 'mamba',       label: 'Update',        sub: 'θ ← θ − η·∇⊥',   x: 779, y: 228, w: 88,  h: 48, accent: 'green' },
  { id: 'stats',  type: 'dataset',     label: 'Stats Buffer',  sub: 'μ, σ² per task',  x: 190, y: 368, w: 152, h: 54, accent: 'mint' },
  { id: 'swr',    type: 'embedding',   label: 'SWR Generator', sub: 'CVAE · h_past',   x: 398, y: 368, w: 130, h: 54, accent: 'violet' },
];

export const SAMPLE_EDGES: DiagramEdge[] = [
  { id: 'in_mamba',    from: 'input',  to: 'mamba',  defaultColor: '#fbbf24', label: 'x' },
  { id: 'mamba_clf',   from: 'mamba',  to: 'clf',    defaultColor: '#7b9fff', label: 'h_new' },
  { id: 'clf_loss',    from: 'clf',    to: 'loss',   defaultColor: '#f87171' },
  { id: 'loss_proj',   from: 'loss',   to: 'proj',   defaultColor: '#f472b6', label: '∇L' },
  { id: 'proj_upd',    from: 'proj',   to: 'update', defaultColor: '#f472b6', label: '∇⊥' },
  { id: 'upd_back',    from: 'update', to: 'mamba',  defaultColor: '#4ade80', label: 'weight update', dashed: true },
  { id: 'mamba_stats', from: 'mamba',  to: 'stats',  defaultColor: '#34d399', label: 'μ, σ²' },
  { id: 'stats_swr',   from: 'stats',  to: 'swr',    defaultColor: '#a78bfa', label: 'h_past' },
  { id: 'swr_mamba',   from: 'swr',    to: 'mamba',  defaultColor: '#a78bfa' },
];

export const SAMPLE_STEPS: Step[] = [
  {
    id: 's0', passLabel: 'ARCHITECTURE', passColor: '#7b9fff',
    taskEmoji: '🧠', taskName: 'HippoCortex Overview', task: 0,
    lit: ['input','mamba','stats','swr','proj','update'], flows: [],
    desc: '<strong>4 components</strong> — Mamba backbone · Stats Buffer · SWR Generator · Null-Space Projector',
  },
  {
    id: 's1', passLabel: 'PASS 1 — WARM-UP', passColor: '#fbbf24',
    taskEmoji: '🐱', taskName: 'Task 1 — Animals', task: 0,
    lit: ['input','mamba','loss','update'],
    flows: [
      { edgeId: 'in_mamba',  speed: 1.2 },
      { edgeId: 'mamba_clf', speed: 1.2 },
      { edgeId: 'clf_loss',  speed: 1.2 },
      { edgeId: 'upd_back',  speed: 1.0 },
    ],
    desc: 'Train on <strong>Task 1 only</strong>. Input → Mamba → Loss → Update θ. No replay yet.',
  },
  {
    id: 's2', passLabel: 'PASS 3 — CONSOLIDATION', passColor: '#34d399',
    taskEmoji: '🐱', taskName: 'Task 1 — Consolidation', task: 0,
    lit: ['mamba','stats'],
    flows: [{ edgeId: 'mamba_stats', speed: 0.8 }],
    desc: 'Stats Buffer stores <strong>μ and σ²</strong> of hidden states. Raw images discarded.',
  },
  {
    id: 's3', passLabel: 'PASS 1 — WARM-UP', passColor: '#fbbf24',
    taskEmoji: '🍎', taskName: 'Task 2 — Fruits', task: 1,
    lit: ['input','mamba','loss','update'],
    flows: [
      { edgeId: 'in_mamba',  speed: 1.2 },
      { edgeId: 'mamba_clf', color: '#a78bfa', speed: 1.2 },
      { edgeId: 'clf_loss',  speed: 1.2 },
      { edgeId: 'upd_back',  speed: 1.0 },
    ],
    desc: 'Task 2 warm-up. Brief training on <strong>Apple &amp; Mango</strong> alone.',
  },
  {
    id: 's4', passLabel: 'SWR REPLAY', passColor: '#a78bfa',
    taskEmoji: '🍎', taskName: 'Task 2 — SWR Active', task: 1,
    lit: ['stats','swr','mamba'],
    flows: [
      { edgeId: 'stats_swr', speed: 0.8 },
      { edgeId: 'swr_mamba', speed: 0.9 },
    ],
    desc: '<strong>CVAE</strong> samples synthetic hidden states h_past from Stats Buffer → Mamba.',
  },
  {
    id: 's5', passLabel: 'PASS 2 — JOINT', passColor: '#a78bfa',
    taskEmoji: '🍎', taskName: 'Task 2 — Joint Pass', task: 1,
    lit: ['input','mamba','swr','loss','proj','update'],
    flows: [
      { edgeId: 'stats_swr',  speed: 0.9 },
      { edgeId: 'swr_mamba',  speed: 0.9 },
      { edgeId: 'in_mamba',   speed: 1.1 },
      { edgeId: 'mamba_clf',  speed: 1.1 },
      { edgeId: 'clf_loss',   speed: 1.1 },
      { edgeId: 'loss_proj',  speed: 1.0 },
      { edgeId: 'proj_upd',   speed: 1.0 },
      { edgeId: 'upd_back',   speed: 0.9 },
    ],
    desc: 'Real <strong>h_new</strong> + synthetic <strong>h_past</strong> mixed. Gradient filtered by <strong>P = I − UUᵀ</strong>.',
  },
  {
    id: 's6', passLabel: 'CONSOLIDATION', passColor: '#34d399',
    taskEmoji: '🍎', taskName: 'Task 2 — Buffer Update', task: 1,
    lit: ['mamba','stats'],
    flows: [{ edgeId: 'mamba_stats', speed: 0.8 }],
    desc: 'Stats Buffer adds <strong>Task 2 μ,σ²</strong>. U matrix extended.',
  },
  {
    id: 's7', passLabel: 'PASS 2 — JOINT', passColor: '#a78bfa',
    taskEmoji: '🚗', taskName: 'Task 3 — Full Pipeline', task: 2,
    lit: ['input','mamba','swr','stats','loss','proj','update'],
    flows: [
      { edgeId: 'stats_swr',  speed: 0.9 }, { edgeId: 'swr_mamba',  speed: 0.9 },
      { edgeId: 'in_mamba',   speed: 1.1 }, { edgeId: 'mamba_clf',  speed: 1.1 },
      { edgeId: 'clf_loss',   speed: 1.1 }, { edgeId: 'loss_proj',  speed: 1.0 },
      { edgeId: 'proj_upd',   speed: 1.0 }, { edgeId: 'upd_back',   speed: 0.9 },
    ],
    desc: 'SWR replays <strong>Tasks 1 &amp; 2</strong>. Projector guards all previous directions.',
  },
  {
    id: 's8', passLabel: '✓ COMPLETE', passColor: '#34d399',
    taskEmoji: '✅', taskName: 'All 3 Tasks Retained', task: 2,
    lit: ['input','mamba','stats','swr','proj','update'],
    flows: [
      { edgeId: 'in_mamba',  speed: 0.8 }, { edgeId: 'mamba_clf', speed: 0.8 },
      { edgeId: 'stats_swr', speed: 0.8 }, { edgeId: 'swr_mamba', speed: 0.8 },
    ],
    desc: '<strong>🐱 Animals · 🍎 Fruits · 🚗 Vehicles</strong> — all retained. Zero raw data stored.',
  },
];

export const NEW_STEP_TEMPLATE: Step = {
  id: '', passLabel: 'NEW STEP', passColor: '#94a3b8',
  taskEmoji: '✨', taskName: 'Untitled step', task: 0,
  lit: [], flows: [],
  desc: 'Click any node or edge to configure this step.',
};

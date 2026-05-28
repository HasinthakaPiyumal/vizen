import type { DiagramNode, DiagramEdge, Step } from '../types';

export const SAMPLE_NODES: DiagramNode[] = [
  { id: 'build',   type: 'rect', label: '🎨 Draw Diagrams',   sub: 'Add shapes & link ports',       x: 50,   y: 90,  w: 170, h: 96, accent: 'blue',   big: true, extra: ['Drag nodes from sidebar', 'Connect anchor borders'] },
  { id: 'seq',     type: 'rect', label: '⏱️ Create Steps',    sub: 'Group slides at bottom',        x: 330,  y: 280, w: 170, h: 96, accent: 'violet', big: true, extra: ['Order presentation slides', 'Write slide descriptions'] },
  { id: 'animate', type: 'rect', label: '⚡ Animate Flows',   sub: 'Configure edge particles',      x: 610,  y: 90,  w: 170, h: 96, accent: 'pink',   big: true, extra: ['Set flow speeds & colors', 'Visualize active paths'] },
  { id: 'ai',      type: 'rect', label: '🤖 AI Superpowers',   sub: 'AI Assist Modal',               x: 890,  y: 280, w: 170, h: 96, accent: 'amber',  big: true, extra: ['Create diagram from prompt', 'Update structure with JSON'] },
  { id: 'present', type: 'rect', label: '🎙️ Present & Show',   sub: 'Fullscreen showcase',           x: 1170, y: 90,  w: 170, h: 96, accent: 'green',  big: true, extra: ['Concentric click ripples 🌊', 'Pulsing neon laser dot 🎯'] },
];

export const SAMPLE_EDGES: DiagramEdge[] = [
  { id: 'build_seq',    from: 'build',   to: 'seq',     defaultColor: '#7b9fff', label: '1. Create Steps' },
  { id: 'seq_animate',  from: 'seq',     to: 'animate', defaultColor: '#a78bfa', label: '2. Animate Edge' },
  { id: 'animate_ai',   from: 'animate', to: 'ai',      defaultColor: '#f472b6', label: '3. Prompt Assist' },
  { id: 'ai_present',   from: 'ai',      to: 'present', defaultColor: '#fbbf24', label: '4. Showcase' },
];

export const SAMPLE_STEPS: Step[] = [
  {
    id: 's0', passLabel: 'ONBOARDING', passColor: '#7b9fff',
    taskEmoji: '🪐', taskName: 'Welcome to Vizen', task: 0,
    lit: ['build'], flows: [],
    desc: 'Welcome to <strong>Vizen</strong>, a premium presentation-oriented diagramming tool. Let\'s walk through how to build interactive presentations step-by-step!'
  },
  {
    id: 's1', passLabel: 'BUILD DIAGRAMS', passColor: '#a78bfa',
    taskEmoji: '🎨', taskName: 'Create & Connect', task: 0,
    lit: ['build'], flows: [],
    desc: 'Drag node chips from the left sidebar onto the canvas, and click-drag from any anchor port on the node borders to Draw Diagrams 🎨.'
  },
  {
    id: 's2', passLabel: 'SEQUENCES', passColor: '#34d399',
    taskEmoji: '⏱️', taskName: 'Setup Steps', task: 0,
    lit: ['build', 'seq'],
    flows: [
      { edgeId: 'build_seq', speed: 1.0 }
    ],
    desc: 'Create slides at the bottom, write slide descriptions, and arrange them in sequential steps to prepare your presentation.'
  },
  {
    id: 's3', passLabel: 'FLOW ANIMATIONS', passColor: '#f472b6',
    taskEmoji: '⚡', taskName: 'Animate Connections', task: 0,
    lit: ['seq', 'animate'],
    flows: [
      { edgeId: 'seq_animate', speed: 1.0 }
    ],
    desc: 'Specify node highlights and active edge flows for each step, and trigger animated particles to explain complex flows.'
  },
  {
    id: 's4', passLabel: 'AI ASSISTANT', passColor: '#fbbf24',
    taskEmoji: '🤖', taskName: 'AI Superpowers', task: 1,
    lit: ['animate', 'ai'],
    flows: [
      { edgeId: 'animate_ai', speed: 1.0 }
    ],
    desc: 'Use AI Assist in the header. Generate brand new diagrams from prompts, or update existing structures automatically by copying the AI JSON response.'
  },
  {
    id: 's5', passLabel: 'SHOWCASE', passColor: '#4ade80',
    taskEmoji: '🎙️', taskName: 'Present Mode', task: 2,
    lit: ['ai', 'present'],
    flows: [
      { edgeId: 'ai_present', speed: 1.0 }
    ],
    desc: 'Click Present in the topbar to hide grids. Highlight segments with a beautiful Neon Laser Pointer and concentric expanding click ripples.'
  }
];

export const NEW_STEP_TEMPLATE: Step = {
  id: '', passLabel: 'NEW STEP', passColor: '#94a3b8',
  taskEmoji: '✨', taskName: 'Untitled step', task: 0,
  lit: [], flows: [],
  desc: 'Click any node or edge to configure this step.',
};

import type { DiagramNode, DiagramEdge, Step } from '../types';

export const SAMPLE_NODES: DiagramNode[] = [
  { id: 'build',   type: 'rect', label: '🎨 Draw Diagrams',   sub: 'Add shapes & link ports',       x: 50,  y: 90,  w: 170, h: 56, accent: 'blue' },
  { id: 'animate', type: 'rect', label: '⚡ Animate & Slide',  sub: 'Create step sequences',         x: 330, y: 280, w: 175, h: 56, accent: 'violet' },
  { id: 'ai',      type: 'rect', label: '🤖 AI Superpowers',   sub: 'AI Assist (New/Update)',        x: 610, y: 90,  w: 175, h: 56, accent: 'amber' },
  { id: 'present', type: 'rect', label: '🎙️ Present & Show',   sub: 'Fullscreen showcase',           x: 890, y: 280, w: 190, h: 56, accent: 'green' },
];

export const SAMPLE_EDGES: DiagramEdge[] = [
  { id: 'build_animate', from: 'build',   to: 'animate', defaultColor: '#7b9fff', label: '1. Create Steps' },
  { id: 'animate_ai',    from: 'animate', to: 'ai',      defaultColor: '#a78bfa', label: '2. Prompt Assist' },
  { id: 'ai_present',    from: 'ai',      to: 'present', defaultColor: '#fbbf24', label: '3. Presentation' },
];

export const SAMPLE_STEPS: Step[] = [
  {
    id: 's0', passLabel: 'ONBOARDING', passColor: '#7b9fff',
    taskEmoji: '🪐', taskName: 'Welcome to Vizen', task: 0,
    lit: ['build'], flows: [],
    desc: 'Welcome to <strong>Vizen</strong>, a premium presentation-oriented diagramming tool. Drag shapes from the sidebar and link anchor ports to **Draw Diagrams** 🎨.'
  },
  {
    id: 's1', passLabel: 'SEQUENCES', passColor: '#a78bfa',
    taskEmoji: '⏱️', taskName: 'Animate & Slide', task: 0,
    lit: ['build', 'animate'],
    flows: [
      { edgeId: 'build_animate', speed: 1.0 }
    ],
    desc: 'Group steps at the bottom, customize descriptions, and trigger **Animated Flows** ⚡ to explain complex architectural layers step-by-step.'
  },
  {
    id: 's2', passLabel: 'AI ASSISTANT', passColor: '#fbbf24',
    taskEmoji: '🤖', taskName: 'AI Superpowers', task: 1,
    lit: ['animate', 'ai'],
    flows: [
      { edgeId: 'animate_ai', speed: 1.0 }
    ],
    desc: 'Click **AI Assist** in the header. Choose between generating a *New* diagram or *Updating* the current structure with simple prompt helpers.'
  },
  {
    id: 's3', passLabel: 'SHOWCASE', passColor: '#f472b6',
    taskEmoji: '🎙️', taskName: 'Present Mode', task: 2,
    lit: ['ai', 'present'],
    flows: [
      { edgeId: 'ai_present', speed: 1.0 }
    ],
    desc: 'Click **Present** to hide grids. Highlight segments with a beautiful **Neon Laser Pointer** and concentric expanding click ripples.'
  }
];

export const NEW_STEP_TEMPLATE: Step = {
  id: '', passLabel: 'NEW STEP', passColor: '#94a3b8',
  taskEmoji: '✨', taskName: 'Untitled step', task: 0,
  lit: [], flows: [],
  desc: 'Click any node or edge to configure this step.',
};

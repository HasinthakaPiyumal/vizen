export type AccentKey = 'blue' | 'violet' | 'mint' | 'green' | 'pink' | 'coral' | 'amber' | 'neutral';

export interface DiagramNode {
  id: string;
  type: string;
  label: string;
  labelHtml?: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: AccentKey;
  big?: boolean;
  extra?: string[];
  groupId?: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';
  imageAspectRatio?: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  defaultColor: string;
  lineType?: 'solid' | 'dashed' | 'dotted';
  arrowHead?: boolean;   // default true
  arrowTail?: boolean;   // default false
  dashed?: boolean;      // legacy alias → lineType 'dashed'
}

export interface FlowEntry {
  edgeId: string;
  color?: string;
  speed?: number;
}

export interface Step {
  id: string;
  passLabel: string;
  passColor: string;
  taskEmoji: string;
  taskName: string;
  task: number;
  lit: string[];
  flows: FlowEntry[];
  desc: string;
}

export type Selection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | { type: 'multi'; ids: string[] }
  | null;

export type Tool = 'select' | 'pan';

export type ResizeHandle = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w';

export interface Point { x: number; y: number }

export interface ConnectionDraft {
  fromId: string;
  fromPort: 'top' | 'right' | 'bottom' | 'left';
  x: number;
  y: number;
}

export interface Snapshot {
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: Step[];
  stepIdx: number;
}

export interface ClipboardData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

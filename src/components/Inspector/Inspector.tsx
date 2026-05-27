import { useDiagramStore } from '../../store/useDiagramStore';
import { NodeInspector } from './NodeInspector';
import { EdgeInspector } from './EdgeInspector';
import { IcCursor } from '../Icons';

export function Inspector() {
  const { selection } = useDiagramStore();

  if (!selection) return null;

  if (selection.type === 'node') return <NodeInspector key={selection.id} nodeId={selection.id}/>;
  if (selection.type === 'edge') return <EdgeInspector key={selection.id} edgeId={selection.id}/>;
  return null; // multi-selection: no inspector panel
}

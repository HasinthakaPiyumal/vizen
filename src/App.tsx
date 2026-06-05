import { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas/Canvas';
import { Inspector } from './components/Inspector/Inspector';
import { BottomBar } from './components/BottomBar';
import { useDiagramStore } from './store/useDiagramStore';
import './styles/tokens.css';
import './styles/app.css';

export function App() {
  const [presenting, setPresenting] = useState(false);
  const selection = useDiagramStore(s => s.selection);
  const title = useDiagramStore(s => s.title);
  const showInspector = selection?.type === 'node' || selection?.type === 'edge';

  useEffect(() => {
    document.title = title
      ? `${title} — Vizen Architecture Diagrams`
      : 'Vizen — Free Architecture Diagram & Visualization Tool';
  }, [title]);

  const exitPresent = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setPresenting(false);
  }, []);

  const enterPresent = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPresenting(true);
  }, []);

  // Exit present when browser leaves fullscreen (ESC key, F11, browser chrome button)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ESC key fallback (handles non-fullscreen presentation mode)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((document.activeElement as HTMLElement)?.isContentEditable) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'Escape' && presenting) exitPresent();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [presenting, exitPresent]);

  return (
    <div className={`app${presenting ? ' presenting' : ''}${showInspector ? ' has-selection' : ''}`}>
      <TopBar presenting={presenting} onPresent={presenting ? exitPresent : enterPresent}/>
      <Sidebar/>
      <Canvas presenting={presenting} onExitPresent={exitPresent}/>
      <Inspector/>
      <BottomBar/>
    </div>
  );
}

import { useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { VizenWordmark } from './Brand';
import { IcPresent, IcCursor, IcHand, IcZoomIn, IcZoomOut, IcFit, IcUndo, IcRedo } from './Icons';
import { useDiagramStore } from '../store/useDiagramStore';
import { AiAssistModal } from './AiAssistModal';
import { exportToPNG, exportToHTML, exportToVideo } from '../utils/exporters';

interface Props {
  presenting: boolean;
  onPresent: () => void;
}

const SHORTCUTS = [
  { keys: ['← / ↑', '→ / ↓'], descs: ['Previous step', 'Next step'] },
  { keys: ['Space'], descs: ['Play / Pause slideshow'] },
  { keys: ['/'], descs: ['Focus node search'] },
  { keys: ['Del', 'Backspace'], descs: ['Delete selected node or edge', ''] },
  { keys: ['Ctrl + / -'], descs: ['Zoom in / Zoom out'] },
  { keys: ['Ctrl + R / Ctrl + 0'], descs: ['Fit diagram to screen size'] },
  { keys: ['Ctrl + Scroll wheel'], descs: ['Smooth focal zoom in / out'] },
  { keys: ['Middle-drag', 'H + drag'], descs: ['Pan canvas', 'Pan (hand tool)'] },
  { keys: ['Double-click node'], descs: ['Edit node label'] },
  { keys: ['Double-click edge'], descs: ['Edit edge label'] },
  { keys: ['Drag node border'], descs: ['Draw a connection to another node'] },
  { keys: ['Click + drag canvas'], descs: ['Rectangle select (select mode)'] },
  { keys: ['Shift + Click node'], descs: ['Add / remove node from selection'] },
  { keys: ['Drag multi-selection'], descs: ['Move grouped nodes together'] },
  { keys: ['Ctrl+G / Cmd+G'], descs: ['Group selected nodes'] },
  { keys: ['Ctrl+Shift+G / Cmd+Shift+G'], descs: ['Ungroup selected nodes'] },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Keyboard Shortcuts</span>
          <button className="btn icon" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {SHORTCUTS.flatMap(({ keys, descs }) =>
            keys.map((k, i) => descs[i] ? (
              <div key={k} className="shortcut-row">
                <kbd className="shortcut-kbd">{k}</kbd>
                <span className="shortcut-desc">{descs[i]}</span>
              </div>
            ) : null)
          )}
        </div>
      </div>
    </div>
  );
}

function HamburgerMenu({
  onNew, onSave, onOpenFile, onExportPNG, onExportHTML, onExportVideo,
}: {
  onNew: () => void;
  onSave: () => void;
  onOpenFile: () => void;
  onExportPNG: () => void;
  onExportHTML: () => void;
  onExportVideo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const act = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <>
      <div className="ham-wrap" ref={wrapRef}>
        <button className="btn icon" title="Menu" onClick={() => setOpen(o => !o)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {open && (
          <div className="ham-menu">
            <div className="ham-group-label">File</div>
            <button className="ham-item" onClick={() => act(onNew)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New diagram
            </button>
            <button className="ham-item" onClick={() => act(onSave)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 12v1.5A.5.5 0 0 0 2.5 14h11a.5.5 0 0 0 .5-.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Save to file
            </button>
            <button className="ham-item" onClick={() => act(onOpenFile)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M2 4.5A.5.5 0 0 1 2.5 4H6l1.5 2H13.5a.5.5 0 0 1 .5.5V12.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              Open file…
            </button>

            <div className="ham-sep"/>
            <div className="ham-group-label">Export</div>
            <button className="ham-item" onClick={() => act(onExportPNG)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Export as PNG Image
            </button>
            <button className="ham-item" onClick={() => act(onExportHTML)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              Export as HTML Viewer
            </button>
            <button className="ham-item" onClick={() => act(onExportVideo)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              Export as WebM Video
            </button>

            <div className="ham-sep"/>
            <div className="ham-group-label">Help</div>

            <button className="ham-item" onClick={() => { setShowShortcuts(true); setOpen(false); }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 7h2M4 10h8M8 7h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".55"/>
              </svg>
              Keyboard shortcuts
            </button>

            <div className="ham-sep"/>

            <div className="ham-item ham-item-about">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 7.5v3.5M8 5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Vizen <span className="ham-version">v0.1</span></span>
            </div>
          </div>
        )}
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)}/>}
    </>
  );
}

export function TopBar({ presenting, onPresent }: Props) {
  const { title, nodes, edges, tool, zoom, setTool, setZoom, triggerFitView, setTitle, resetDiagram, past, future, undo, redo } = useDiagramStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<number | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(false);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = titleContainerRef.current;
    const text = titleTextRef.current;
    if (container && text) {
      const overflow = text.scrollWidth - container.clientWidth;
      if (overflow > 0) {
        setIsTitleOverflowing(true);
        text.style.setProperty('--scroll-dist', `-${overflow}px`);
      } else {
        setIsTitleOverflowing(false);
        text.style.removeProperty('--scroll-dist');
      }
    }
  }, [title, isEditingTitle]);

  const getSvgEl = () => document.getElementById('vizen-svg-canvas') as SVGSVGElement | null;

  const handleExportPNG = () => {
    const svgEl = getSvgEl();
    if (svgEl) {
      exportToPNG(svgEl, nodes, title);
    } else {
      alert('Canvas SVG not found.');
    }
  };

  const handleExportHTML = () => {
    const svgEl = getSvgEl();
    if (svgEl) {
      const state = useDiagramStore.getState();
      exportToHTML(svgEl, nodes, edges, state.steps, title);
    } else {
      alert('Canvas SVG not found.');
    }
  };

  const handleExportVideo = () => {
    const svgEl = getSvgEl();
    if (!svgEl) {
      alert('Canvas SVG not found.');
      return;
    }
    const state = useDiagramStore.getState();
    if (state.steps.length === 0) {
      alert('No steps to export.');
      return;
    }
    setRecordingProgress(0);
    exportToVideo(
      svgEl,
      nodes,
      state.steps,
      {
        stepIdx: useDiagramStore.getState().stepIdx,
        setStepIdx: (idx) => flushSync(() => useDiagramStore.setState({ stepIdx: idx })),
      },
      title,
      (progress) => setRecordingProgress(progress),
      () => setRecordingProgress(null)
    );
  };

  const handleNew = () => {
    if (nodes.length > 0 || edges.length > 0) {
      if (!window.confirm('Start a new diagram? Your current work will be cleared.')) return;
    }
    resetDiagram();
  };

  const handleSave = () => {
    const { title: t, nodes: n, edges: e, steps: s, stepIdx: si } = useDiagramStore.getState();
    const data = JSON.stringify({ title: t, nodes: n, edges: e, steps: s, stepIdx: si }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(t || 'untitled').toLowerCase().replace(/\s+/g, '-')}.vz`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        useDiagramStore.setState({
          title:   parsed.title   ?? 'Untitled',
          nodes:   parsed.nodes   ?? [],
          edges:   parsed.edges   ?? [],
          steps:   parsed.steps   ?? [],
          stepIdx: parsed.stepIdx ?? 0,
          selection: null,
        });
        triggerFitView();
      } catch {
        alert('Could not read file — invalid format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (presenting) return null;

  return (
    <div className="topbar">
      {/* ── LEFT: Hamburger → Brand → Title ── */}
      <div className="group">
        <HamburgerMenu
          onNew={handleNew}
          onSave={handleSave}
          onOpenFile={() => fileInputRef.current?.click()}
          onExportPNG={handleExportPNG}
          onExportHTML={handleExportHTML}
          onExportVideo={handleExportVideo}
        />
        <input ref={fileInputRef} type="file" accept=".vz" style={{ display: 'none' }} onChange={handleOpen}/>
        <div className="tb-div"/>
        <VizenWordmark size={15}/>
        <div className="tb-div"/>
        {isEditingTitle ? (
          <input
            className="title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={e => {
              setIsEditingTitle(false);
              if (!e.target.value.trim()) setTitle('Untitled');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur();
              }
            }}
            autoFocus
            placeholder="Untitled"
            spellCheck={false}
          />
        ) : (
          <div
            ref={titleContainerRef}
            className="title-display-wrap"
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit title"
          >
            <div
              ref={titleTextRef}
              className={`title-display-text ${isTitleOverflowing ? 'marquee' : ''}`}
            >
              {title}
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER: Tool modes + Zoom controls ── */}
      <div className="group center tb-controls">
        {/* Tool mode toggles */}
        <div className="tb-tool-group">
          <button
            className={`tb-tool-btn ${tool === 'select' ? 'active' : ''}`}
            title="Select / Rect-select (V)"
            onClick={() => setTool('select')}
          >
            <IcCursor size={14}/>
          </button>
          <button
            className={`tb-tool-btn ${tool === 'pan' ? 'active' : ''}`}
            title="Pan (H)"
            onClick={() => setTool('pan')}
          >
            <IcHand size={14}/>
          </button>
        </div>

        <div className="tb-div"/>

        {/* Undo/Redo controls */}
        <div className="tb-zoom-group" style={{ marginRight: 6 }}>
          <button className="icon-btn" title="Undo (Ctrl+Z)" onClick={undo} disabled={past.length === 0}>
            <IcUndo size={13}/>
          </button>
          <button className="icon-btn" title="Redo (Ctrl+Y)" onClick={redo} disabled={future.length === 0}>
            <IcRedo size={13}/>
          </button>
        </div>

        <div className="tb-div"/>

        {/* Zoom controls */}
        <div className="tb-zoom-group">
          <button className="icon-btn" title="Zoom out" onClick={() => setZoom(Math.max(0.15, zoom - 0.25))}>
            <IcZoomOut size={13}/>
          </button>
          <span className="tb-zoom-val">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" title="Zoom in" onClick={() => setZoom(Math.min(4, zoom + 0.25))}>
            <IcZoomIn size={13}/>
          </button>
          <div className="tb-div"/>
          <button className="icon-btn" title="Fit to screen" onClick={triggerFitView}>
            <IcFit size={13}/>
          </button>
        </div>
      </div>

      {/* ── RIGHT: AI Assist + Present + Avatar ── */}
      <div className="group">
        <button
          className="btn"
          onClick={() => setShowAiAssist(true)}
          title="AI Assist — generate diagram changes with AI"
          style={{ gap: 6, borderColor: 'rgba(167,139,250,0.3)', color: '#a78bfa' }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.5l-3.7 1.9.7-4.1-3-2.9 4.2-.8L8 1z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(167,139,250,0.15)"/>
          </svg>
          <span>AI Assist</span>
        </button>
        <button
          className="btn primary icon"
          onClick={onPresent}
          title="Present fullscreen"
        >
          <IcPresent size={13}/>
        </button>
        <div className="avatar">V</div>
      </div>

      {showAiAssist && <AiAssistModal onClose={() => setShowAiAssist(false)}/>}

      {recordingProgress !== null && (
        <div className="export-overlay">
          <div className="export-panel">
            <div className="export-spinner" />
            <div className="export-title">Exporting WebM Video</div>
            <div className="export-progress-bar-wrap">
              <div className="export-progress-bar" style={{ width: `${recordingProgress}%` }} />
            </div>
            <div className="export-percent">{Math.round(recordingProgress)}%</div>
            <div className="export-hint">Please keep this tab active while rendering...</div>
          </div>
        </div>
      )}
    </div>
  );
}

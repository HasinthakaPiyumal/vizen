import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { IcPrev, IcNext, IcPlay, IcPause, IcPlus, IcTrash } from './Icons';

function FormatBar({ onFmt }: { onFmt: (cmd: string, val?: string) => void }) {
  const mb = (e: React.MouseEvent) => e.preventDefault();
  return (
    <div className="fmt-toolbar fmt-toolbar-desc">
      <button className="fmt-btn" style={{ fontWeight: 'bold' }} onMouseDown={mb} onClick={() => onFmt('bold')}>B</button>
      <button className="fmt-btn" style={{ fontStyle: 'italic' }} onMouseDown={mb} onClick={() => onFmt('italic')}>I</button>
      <button className="fmt-btn" style={{ textDecoration: 'underline' }} onMouseDown={mb} onClick={() => onFmt('underline')}>U</button>
      <div className="fmt-div"/>
      {(['H1','H2','H3','H4'] as const).map(h => (
        <button key={h} className="fmt-btn fmt-h" onMouseDown={mb} onClick={() => onFmt('formatBlock', h.toLowerCase())}>{h}</button>
      ))}
      <div className="fmt-div"/>
      <button className="fmt-btn" onMouseDown={mb} onClick={() => onFmt('removeFormat')}>✕</button>
    </div>
  );
}

export function BottomBar() {
  const { steps, stepIdx, playing, setStepIdx, setPlaying, addStep, deleteStep, updateStep } = useDiagramStore();
  const step = steps[stepIdx];
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const descRef      = useRef<HTMLDivElement>(null);
  const descWrapRef  = useRef<HTMLDivElement>(null);
  const [descFocused, setDescFocused] = useState(false);

  // Sync content + animate wrapper on step change (never remount the editor)
  useEffect(() => {
    if (descFocused) return;
    const wrap = descWrapRef.current;
    const el   = descRef.current;
    if (!el || !wrap) return;

    // Fade out → swap content → fade in
    wrap.style.transition = 'none';
    wrap.style.opacity    = '0';
    wrap.style.transform  = 'translateY(6px)';

    const raf = requestAnimationFrame(() => {
      el.innerHTML = step?.desc ?? '';
      wrap.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      wrap.style.opacity    = '1';
      wrap.style.transform  = 'translateY(0)';
    });
    return () => cancelAnimationFrame(raf);
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-play
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const { stepIdx: idx, steps: ss, setStepIdx: set } = useDiagramStore.getState();
        set(idx >= ss.length - 1 ? 0 : idx + 1);
      }, 2400);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' ||
          (document.activeElement as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setStepIdx(Math.max(0, stepIdx - 1)); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setStepIdx(Math.min(steps.length - 1, stepIdx + 1)); }
      if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepIdx, steps.length, playing, setStepIdx, setPlaying]);

  if (!step) return null;

  const execFmt = (cmd: string, val?: string) => {
    descRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const saveDesc = () => {
    if (!descRef.current) return;
    const html = descRef.current.innerHTML;
    updateStep(stepIdx, s => ({ ...s, desc: html }));
    setDescFocused(false);
  };

  return (
    <div className="bottombar">
      {/* Left */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <button className="btn" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>
          <IcPrev size={13}/><span>Prev</span>
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn icon" title="Add step after" onClick={addStep}><IcPlus size={13}/></button>
          <button className="btn icon" title="Delete this step" disabled={steps.length <= 1} onClick={deleteStep}><IcTrash size={13}/></button>
        </div>
      </div>

      {/* Center — editable step description */}
      <div className="step-desc" style={{ position: 'relative' }}>
        {descFocused && <FormatBar onFmt={execFmt}/>}
        <div ref={descWrapRef} style={{ display: 'contents' }}>
          <div
            ref={descRef}
            contentEditable
            suppressContentEditableWarning
            className="step-desc-editor"
            data-placeholder="Add a step description…"
            onFocus={() => setDescFocused(true)}
            onBlur={saveDesc}
          />
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="stepcount">{stepIdx + 1} / {steps.length}</span>
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn" onClick={() => setPlaying(!playing)} title="Space to toggle"
                  disabled={steps.length <= 1}>
            {playing ? <IcPause size={12}/> : <IcPlay size={12}/>}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button className="btn primary"
                  onClick={() => setStepIdx(Math.min(steps.length - 1, stepIdx + 1))}
                  disabled={stepIdx === steps.length - 1}>
            <span>Next</span><IcNext size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useDiagramStore, ACCENT_COLORS } from '../../store/useDiagramStore';
import { NODE_ICON_MAP, IcTrash, IcImage } from '../Icons';
import type { AccentKey } from '../../types';

const ACCENT_OPTIONS: { key: AccentKey; color: string }[] = [
  { key: 'blue',    color: '#7b9fff' },
  { key: 'violet',  color: '#a78bfa' },
  { key: 'mint',    color: '#34d399' },
  { key: 'green',   color: '#4ade80' },
  { key: 'pink',    color: '#f472b6' },
  { key: 'coral',   color: '#f87171' },
  { key: 'amber',   color: '#fbbf24' },
  { key: 'neutral', color: '#94a3b8' },
];

export function NodeInspector({ nodeId }: { nodeId: string }) {
  const { nodes, updateNode, deleteNode } = useDiagramStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const node = nodes.find(n => n.id === nodeId);

  if (!node) return null;

  const c    = ACCENT_COLORS[node.accent] ?? ACCENT_COLORS.neutral;
  const Icon = NODE_ICON_MAP[node.type];

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || 180;
        let h = img.naturalHeight || 120;
        const aspect = w / h;
        const currentW = Math.max(100, node.w);
        const newH = Math.round(currentW / aspect);

        useDiagramStore.getState().pushToUndo();
        updateNode(nodeId, {
          imageUrl: dataUrl,
          w: currentW,
          h: Math.max(60, newH),
          imageAspectRatio: aspect,
          imageFit: node.imageFit || 'cover',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetAspectRatio = () => {
    if (!node.imageUrl) return;
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const currentW = node.w;
      const newH = Math.round(currentW / aspect);
      useDiagramStore.getState().pushToUndo();
      updateNode(nodeId, { h: Math.max(60, newH), imageAspectRatio: aspect });
    };
    img.src = node.imageUrl;
  };

  return (
    <motion.div className="inspector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="insp-header">
        <div className="insp-icon" style={{ background: c.fill, border: `1px solid ${c.edge}`, color: c.color }}>
          {Icon && <Icon size={17}/>}
        </div>
        <div>
          <div className="insp-name">{node.label}</div>
        </div>
      </div>

      {/* Image Settings */}
      <div className="insp-section">
        <div className="insp-section-title">Image Media</div>

        {/* Thumbnail Preview */}
        {node.imageUrl ? (
          <div className="insp-image-preview">
            <img src={node.imageUrl} alt="Node preview" style={{ objectFit: node.imageFit || 'cover' }} />
          </div>
        ) : (
          <div className="insp-image-placeholder-box">
            <IcImage size={24} />
            <span>No Image Selected</span>
          </div>
        )}

        {/* Upload & Clear buttons */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageFile}
        />
        <div className="insp-row" style={{ marginTop: 8 }}>
          <button
            className="btn"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <IcImage size={14} />
            <span>{node.imageUrl ? 'Change Image…' : 'Upload Image…'}</span>
          </button>
          {node.imageUrl && (
            <button
              className="btn danger icon"
              title="Remove image"
              onClick={() => {
                useDiagramStore.getState().pushToUndo();
                updateNode(nodeId, { imageUrl: undefined });
              }}
            >
              <IcTrash size={13} />
            </button>
          )}
        </div>

        {/* Image URL input */}
        <div className="insp-row" style={{ marginTop: 8 }}>
          <span className="insp-label">URL</span>
          <input
            className="insp-input"
            style={{ maxWidth: '100%', textAlign: 'left' }}
            placeholder="https://… or data:image/…"
            value={node.imageUrl || ''}
            onFocus={() => useDiagramStore.getState().pushToUndo()}
            onChange={e => updateNode(nodeId, { imageUrl: e.target.value.trim() || undefined })}
          />
        </div>

        {/* Fit Mode */}
        {node.imageUrl && (
          <>
            <div className="insp-row" style={{ marginTop: 8 }}>
              <span className="insp-label">Fit</span>
              <div className="insp-fit-group">
                {(['cover', 'contain', 'fill'] as const).map(fit => (
                  <button
                    key={fit}
                    className={`fit-btn ${node.imageFit === fit || (!node.imageFit && fit === 'cover') ? 'active' : ''}`}
                    onClick={() => {
                      useDiagramStore.getState().pushToUndo();
                      updateNode(nodeId, { imageFit: fit });
                    }}
                  >
                    {fit.charAt(0).toUpperCase() + fit.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="insp-row" style={{ marginTop: 8 }}>
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
                onClick={handleResetAspectRatio}
              >
                Reset Aspect Ratio
              </button>
            </div>
          </>
        )}
      </div>

      {/* Accent color */}
      <div className="insp-section">
        <div className="insp-section-title">Accent</div>
        <div className="color-swatches">
          {ACCENT_OPTIONS.map(o => (
            <div key={o.key}
                 className={`color-sw ${node.accent === o.key ? 'selected' : ''}`}
                 style={{ background: o.color }}
                 title={o.key}
                 onClick={() => { useDiagramStore.getState().pushToUndo(); updateNode(nodeId, { accent: o.key }); }}/>
          ))}
        </div>
      </div>

      {/* Position & Size */}
      <div className="insp-section">
        <div className="insp-section-title">Layout</div>
        <div className="insp-row">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>X</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.x)}
                 onFocus={() => useDiagramStore.getState().pushToUndo()}
                 onChange={e => updateNode(nodeId, { x: +e.target.value || 0 })}/>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>Y</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.y)}
                 onFocus={() => useDiagramStore.getState().pushToUndo()}
                 onChange={e => updateNode(nodeId, { y: +e.target.value || 0 })}/>
        </div>
        <div className="insp-row">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>W</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.w)}
                 onFocus={() => useDiagramStore.getState().pushToUndo()}
                 onChange={e => updateNode(nodeId, { w: Math.max(60, +e.target.value || 60) })}/>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-4)' }}>H</span>
          <input className="insp-input mono" style={{ maxWidth: 72 }}
                 value={Math.round(node.h)}
                 onFocus={() => useDiagramStore.getState().pushToUndo()}
                 onChange={e => updateNode(nodeId, { h: Math.max(36, +e.target.value || 36) })}/>
        </div>
      </div>

      {/* Delete */}
      <div className="insp-delete-row">
        <button className="btn danger" style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => deleteNode(nodeId)}>
          <IcTrash size={13}/>
          <span>Delete node</span>
        </button>
      </div>
    </motion.div>
  );
}

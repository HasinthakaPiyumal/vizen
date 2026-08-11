import { useRef, useState, useEffect } from 'react';
import { IcSearch, IcSquare, IcCircle, IcDiamond, IcText, IcImage } from './Icons';
import { useDiagramStore } from '../store/useDiagramStore';
import type { FC } from 'react';

interface NodeChipDef {
  id: string;
  label: string;
  Icon: FC<{ size?: number }>;
}

const NODE_ITEMS: NodeChipDef[] = [
  { id: 'rect',    label: 'Rectangle', Icon: IcSquare  },
  { id: 'circle',  label: 'Circle',    Icon: IcCircle  },
  { id: 'diamond', label: 'Diamond',   Icon: IcDiamond },
  { id: 'text',    label: 'Text',      Icon: IcText    },
  { id: 'image',   label: 'Image',     Icon: IcImage   },
];

export function Sidebar() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' &&
          !(document.activeElement as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const { zoom, pan, addNode } = useDiagramStore.getState();

    // Place near center of view
    const wrapEl = document.getElementById('vizen-svg-canvas')?.parentElement;
    const viewW = wrapEl ? wrapEl.clientWidth : 800;
    const viewH = wrapEl ? wrapEl.clientHeight : 600;
    const centerX = (viewW / 2 - pan.x) / zoom;
    const centerY = (viewH / 2 - pan.y) / zoom;

    files.forEach((file, index) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) return;

        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || 200;
          let h = img.naturalHeight || 150;
          const MAX_INITIAL_W = 220;
          if (w > MAX_INITIAL_W) {
            h = Math.round((MAX_INITIAL_W / w) * h);
            w = MAX_INITIAL_W;
          }
          w = Math.max(80, w);
          h = Math.max(60, h);

          addNode('image', centerX - w / 2 + index * 20, centerY - h / 2 + index * 20, {
            imageUrl: dataUrl,
            w, h,
            label: file.name.replace(/\.[^/.]+$/, '') || 'Image',
            imageFit: 'cover',
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const q = query.toLowerCase();
  const filtered = q ? NODE_ITEMS.filter(n => n.label.toLowerCase().includes(q)) : NODE_ITEMS;

  return (
    <div className="sidebar">
      {filtered.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Shapes & Elements</span>
          </div>
          <div className="node-grid">
            {filtered.map(n => (
              <div
                key={n.id}
                className="node-chip"
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('nodeType', n.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                title={`Drag to add ${n.label}`}
              >
                <div className="nc-icon"><n.Icon size={20}/></div>
                <div className="nc-label">{n.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Image Action */}
      <div className="section" style={{ marginTop: 12 }}>
        <div className="section-header">
          <span className="section-title">Media</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          className="sidebar-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload image files (.png, .jpg, .svg, .webp) into diagram"
        >
          <IcImage size={18} />
          <span>Upload Image…</span>
        </button>
      </div>
    </div>
  );
}

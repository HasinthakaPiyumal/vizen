import { useRef, useState, useEffect } from 'react';
import { IcSearch, IcSquare, IcCircle, IcDiamond, IcText } from './Icons';
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
];

export function Sidebar() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const q = query.toLowerCase();
  const filtered = q ? NODE_ITEMS.filter(n => n.label.toLowerCase().includes(q)) : NODE_ITEMS;

  return (
    <div className="sidebar">
      {/* <div className="sidebar-search">
        <IcSearch size={14} className="search-icon"/>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search nodes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {!query && <span className="search-kbd">/</span>}
      </div> */}

      {filtered.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Shapes</span>
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
    </div>
  );
}

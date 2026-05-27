import React from 'react';

interface IconProps { size?: number; className?: string; }
const Ic = ({ d, size = 18, children, sw = 1.75, className }: { d?: string; size?: number; children?: React.ReactNode; sw?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children ?? <path d={d} />}
  </svg>
);

export const IcSearch    = (p: IconProps) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ic>;
export const IcPlus      = (p: IconProps) => <Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>;
export const IcPlay      = (p: IconProps) => <Ic {...p}><polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none"/></Ic>;
export const IcPause     = (p: IconProps) => <Ic {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/></Ic>;
export const IcShare     = (p: IconProps) => <Ic {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></Ic>;
export const IcSparkle   = (p: IconProps) => <Ic {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></Ic>;
export const IcCursor    = (p: IconProps) => <Ic {...p}><path d="M5 3l6 18 2-7 7-2z"/></Ic>;
export const IcHand      = (p: IconProps) => <Ic {...p}><path d="M18 11V6a2 2 0 10-4 0v5"/><path d="M14 10V4a2 2 0 10-4 0v6"/><path d="M10 10.5V6a2 2 0 10-4 0v8"/><path d="M18 8a2 2 0 114 0v6a8 8 0 01-8 8h-2c-2.8 0-4.5-1.7-6-3.5L1 12a2 2 0 113-2.5l3 3"/></Ic>;
export const IcText      = (p: IconProps) => <Ic {...p}><path d="M4 7V4h16v3M9 20h6M12 4v16"/></Ic>;
export const IcSquare    = (p: IconProps) => <Ic {...p}><rect x="4" y="4" width="16" height="16" rx="2"/></Ic>;
export const IcCircle    = (p: IconProps) => <Ic {...p}><circle cx="12" cy="12" r="8"/></Ic>;
export const IcDiamond   = (p: IconProps) => <Ic {...p}><polygon points="12,3 21,12 12,21 3,12"/></Ic>;
export const IcArrow     = (p: IconProps) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ic>;
export const IcZoomIn    = (p: IconProps) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></Ic>;
export const IcZoomOut   = (p: IconProps) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/></Ic>;
export const IcFit       = (p: IconProps) => <Ic {...p}><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/></Ic>;
export const IcUndo      = (p: IconProps) => <Ic {...p}><path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></Ic>;
export const IcRedo      = (p: IconProps) => <Ic {...p}><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/></Ic>;
export const IcPrev      = (p: IconProps) => <Ic {...p}><path d="M15 6l-6 6 6 6"/></Ic>;
export const IcNext      = (p: IconProps) => <Ic {...p}><path d="M9 6l6 6-6 6"/></Ic>;
export const IcTrash     = (p: IconProps) => <Ic {...p}><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></Ic>;
export const IcPresent   = (p: IconProps) => <Ic {...p}><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></Ic>;
export const IcMinimize  = (p: IconProps) => <Ic {...p}><path d="M8 3v4H4M16 3v4h4M8 21v-4H4M16 21v-4h4"/></Ic>;
export const IcMap       = (p: IconProps) => <Ic {...p}><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></Ic>;

// Node domain icons
export const NMamba       = (p: IconProps) => <Ic {...p}><path d="M3 18c3-12 6-12 9 0s6 12 9 0"/></Ic>;
export const NTransformer = (p: IconProps) => <Ic {...p}><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 10v4M12 10v4M17 10v4"/></Ic>;
export const NEmbedding   = (p: IconProps) => <Ic {...p}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><path d="M8 7l3 4M16 7l-3 4M8 17l3-4M16 17l-3-4"/></Ic>;
export const NDataset     = (p: IconProps) => <Ic {...p}><ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"/></Ic>;
export const NLoss        = (p: IconProps) => <Ic {...p}><path d="M3 21l4-8 4 4 6-12 4 8"/></Ic>;

// Map type id → icon component
export const NODE_ICON_MAP: Record<string, React.FC<IconProps>> = {
  rect: IcSquare, circle: IcCircle, diamond: IcDiamond, text: IcText,
  mamba: NMamba, transformer: NTransformer, embedding: NEmbedding, dataset: NDataset, loss: NLoss,
};

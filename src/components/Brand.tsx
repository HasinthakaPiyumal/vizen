const VizenMark = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 40 40" width={size} height={size}>
    <defs>
      <linearGradient id="vz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7b9fff"/>
        <stop offset="100%" stopColor="#b08cff"/>
      </linearGradient>
    </defs>
    <path d="M6 10 L20 34 L34 10" fill="none" stroke="url(#vz-grad)"
          strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="14" r="2.2" fill="#7b9fff"/>
    <circle cx="20" cy="34" r="2.6" fill="#a78bfa"/>
    <circle cx="31" cy="14" r="2.2" fill="#f472b6"/>
  </svg>
);

export const VizenWordmark = ({ size = 15 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <VizenMark size={size + 7}/>
    <span className="brand" style={{ fontSize: size }}>Vizen</span>
  </div>
);

export default VizenWordmark;

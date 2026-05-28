const VizenMark = ({ size = 22 }: { size?: number }) => (
  <img
    src="/favicon.svg"
    alt="Vizen Logo"
    width={size}
    height={size}
    style={{ display: 'block', objectFit: 'contain' }}
  />
);

export const VizenWordmark = ({ size = 15 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <VizenMark size={size + 7}/>
    <span className="brand" style={{ fontSize: size }}>Vizen</span>
  </div>
);

export default VizenWordmark;

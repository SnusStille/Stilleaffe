// Dekorativt handelsgolv: pulserande ljusstakar, en ritad kurslinje, guldstoft och ett svepande ljus.
// Ingen riktig marknads- eller säljdata – ren stämning. Bara transform/opacity animeras.
const N = 28;
const pts = Array.from({ length: 41 }, (_, i) => {
  const x = i * 30, y = 240 - i * 3.2 + Math.sin(i * 1.3) * 22 + Math.cos(i * 0.7) * 14;
  return `${x},${y.toFixed(1)}`;
});
const LINE = 'M' + pts.join(' L');
const AREA = LINE + ' L1200,300 L0,300 Z';

export default function FloorBg({ variant = 'app' }: { variant?: 'app' | 'login' }) {
  const id = 'fl-grad-' + variant;
  return (
    <div className={'floor-bg ' + variant} aria-hidden="true">
      <div className="fl-candles">
        {Array.from({ length: N }, (_, i) => (
          <span key={i} className={'cd ' + ((i * 7) % 3 !== 0 ? 'up' : 'dn')}
            style={{ ['--h' as any]: 18 + ((i * 37) % 52) + '%', ['--d' as any]: 3 + (i % 7) * 0.7 + 's', ['--l' as any]: -(i * 0.37) + 's' }}>
            <i />
          </span>
        ))}
      </div>
      <svg className="fl-line" viewBox="0 0 1200 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e5b94e" stopOpacity=".35" />
            <stop offset="1" stopColor="#e5b94e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="fl-area" d={AREA} fill={`url(#${id})`} />
        <path className="fl-path" d={LINE} pathLength={1600} />
      </svg>
      <div className="fl-dust">
        {Array.from({ length: 16 }, (_, i) => (
          <i key={i} style={{ ['--x' as any]: (i * 61) % 100 + '%', ['--d' as any]: 14 + (i % 6) * 3 + 's', ['--l' as any]: -(i * 1.7) + 's', ['--s' as any]: 2 + (i % 3) + 'px' }} />
        ))}
      </div>
      <div className="fl-beam" />
    </div>
  );
}

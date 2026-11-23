import type { CSSProperties } from 'react';

export function BrandMark({ size = 40, className = '', style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      role="img"
      aria-label="Label Lab"
      style={style}
    >
      <defs>
        <linearGradient id="llBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#161d25" />
          <stop offset="0.55" stopColor="#0b0f14" />
          <stop offset="1" stopColor="#06080b" />
        </linearGradient>
        <linearGradient id="llMint" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8ff7dc" />
          <stop offset="0.5" stopColor="#4fe3c1" />
          <stop offset="1" stopColor="#1fb9a0" />
        </linearGradient>
        <linearGradient id="llChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f8fc" />
          <stop offset="0.5" stopColor="#c3ceda" />
          <stop offset="1" stopColor="#8291a2" />
        </linearGradient>
        <radialGradient id="llGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5eead4" stopOpacity=".38" />
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="128" height="128" rx="32" fill="url(#llBg)" />
      <rect x="1" y="1" width="126" height="126" rx="31" fill="none" stroke="#fff" strokeOpacity=".14" />
      <path d="M8 34 A26 26 0 0 1 34 8 H94 A26 26 0 0 1 120 34" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="2" />
      <circle cx="64" cy="64" r="46" fill="url(#llGlow)" opacity=".55" />
      <path d="M42 34 V86 H66" fill="none" stroke="url(#llChrome)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity=".62" />
      <path d="M64 50 V100 H88" fill="none" stroke="url(#llMint)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="48" r="6.5" fill="#0b0f14" />
      <circle cx="96" cy="48" r="4.6" fill="url(#llMint)" />
    </svg>
  );
}

export function BrandName({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'sm' ? 0.85 : size === 'lg' ? 1.25 : 1;
  return (
    <div className="brand-name" style={{ fontSize: 15.5 * scale }}>
      LABEL <span className="lab">LAB</span>
    </div>
  );
}

export function BrandLockup({ markSize = 52, showSub = true }: { markSize?: number; showSub?: boolean }) {
  return (
    <div className="brand-lockup">
      <BrandMark size={markSize} />
      <div>
        <div className="brand-name" style={{ fontSize: markSize * 0.38 }}>
          LABEL <span className="lab">LAB</span>
        </div>
        {showSub && <div className="brand-sub" style={{ fontSize: markSize * 0.17 }}>SALES PERFORMANCE</div>}
      </div>
    </div>
  );
}

export function BrandSubline() {
  return <div className="brand-sub">LABEL LAB · SALES PERFORMANCE</div>;
}

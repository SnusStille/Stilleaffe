'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

export function Card({ children, className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionHead({ title, kicker, action, sub }: { title: React.ReactNode; kicker?: string; action?: React.ReactNode; sub?: string }) {
  return (
    <div className="card-head">
      <div>
        {kicker && <div className="card-kicker">{kicker}</div>}
        <h3>{title}</h3>
        {sub && <div className="card-note" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function Kpi({ label, value, sub, tone, className = '', trend, suffix }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'mint' | 'ice' | 'gold' | 'violet'; className?: string; trend?: 'up' | 'down'; suffix?: string }) {
  return (
    <div className={`kpi ${tone || ''} ${trend ? `trend-${trend}` : ''} ${className}`}>
      <div className="k">{label}</div>
      <div className="v">{value}{suffix && <small>{suffix}</small>}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}

export function Progress({ value, tone, className = '' }: { value: number; tone?: 'ice' | 'gold' | 'red'; className?: string }) {
  return (
    <div className={`progress ${tone || ''} ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 10, label, sub, tone = 'mint' }: { value: number; size?: number; stroke?: number; label?: React.ReactNode; sub?: string; tone?: 'mint' | 'ice' | 'gold' }) {
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const colors = { mint: ['#2dd4bf', '#8ff7dc'], ice: ['#38bdf8', '#7dd3fc'], gold: ['#d97706', '#f5c26b'] }[tone];
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`rg${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="100%" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#rg${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 0 8px rgba(94,234,212,.25))' }}
        />
      </svg>
      <div className="ring-label">
        <b>{label ?? `${Math.round(v)}%`}</b>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'default', className = '' }: { children: React.ReactNode; tone?: 'mint' | 'ice' | 'gold' | 'violet' | 'red' | 'green' | 'solid' | 'default'; className?: string }) {
  return <span className={`badge ${tone} ${className}`}>{children}</span>;
}

export function Delta({ value, suffix = '%', digits = 0 }: { value: number | null; suffix?: string; digits?: number }) {
  if (value === null || Number.isNaN(value)) return <span className="delta flat">–</span>;
  const up = value > 0;
  const down = value < 0;
  const abs = Math.abs(value);
  const text = digits ? abs.toFixed(digits) : Math.round(abs).toString();
  return (
    <span className={`delta ${up ? 'up' : down ? 'down' : 'flat'}`}>
      {up ? <Icon name="arrow-up" size={11} /> : down ? <Icon name="arrow-down" size={11} /> : null}
      {text}
      {suffix}
    </span>
  );
}

export function SourceTag({ source }: { source: 'official' | 'internal' | 'verify' }) {
  const map = {
    official: ['official', 'Officiell produktinformation'],
    internal: ['internal', 'Internt säljargument'],
    verify: ['verify', 'Kontrollera med ledning'],
  } as const;
  const [tone, label] = map[source];
  return <span className={`source-tag ${tone}`}>{label}</span>;
}

export function Empty({ title, children, icon = 'layers', action }: { title: string; children?: React.ReactNode; icon?: React.ComponentProps<typeof Icon>['name']; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="e-icon"><Icon name={icon} size={20} /></div>
      <h4>{title}</h4>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Sparkline({ values, height = 44, goal }: { values: number[]; height?: number; goal?: number }) {
  if (!values.length) return <div className="spark" style={{ height }} />;
  const max = Math.max(...values, goal || 0, 1);
  return (
    <div className="spark" style={{ height }} aria-hidden="true">
      {values.map((v, i) => (
        <i key={i} className={v === 0 ? 'zero' : ''} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

export function Bars({ data, height = 180, goal }: { data: { label: string; value: number | null; meta?: string }[]; height?: number; goal?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0), goal ?? 0);
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div className="bar-col" key={i} title={d.meta}>
          <span className="bar-val">{d.value === null ? '' : d.value}</span>
          <div className="bar-track">
            {d.value === null ? (
              <div className="bar miss" style={{ height: '8%' }} />
            ) : (
              <div className={`bar ${d.value === 0 ? 'zero' : ''}`} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
            )}
          </div>
          <span className="bar-lab">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function StackedBar({ segments, height = 12 }: { segments: { value: number; className: string; label: string }[]; height?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="stacked" style={{ height }} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
      {segments.map((s, i) =>
        total > 0 ? <i key={i} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} /> : null,
      )}
    </div>
  );
}

export function Avatar({ name, role, size = 'md' }: { name: string; role?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const initials = name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return <div className={`avatar ${role === 'manager' ? 'manager' : ''} ${size === 'md' ? '' : size}`}>{initials}</div>;
}

export function MetricRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <b>{children}</b>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 680 }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" ref={ref} style={{ width: `min(${width}px, 100%)` }} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Dialog'}>
        <div className="modal-head">
          <div>
            <div className="card-kicker">LABEL LAB</div>
            <h3 style={{ fontSize: 18, fontWeight: 720, letterSpacing: '-0.02em' }}>{title}</h3>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Stäng"><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Skeleton({ height = 90, className = '' }: { height?: number; className?: string }) {
  return <div className={`skel ${className}`} style={{ height }} aria-hidden="true" />;
}

export function CopyButton({ text, label = 'Kopiera', mint = false, onCopied }: { text: string; label?: string; mint?: boolean; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch {}
      t.remove();
    }
    setCopied(true);
    onCopied?.();
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button type="button" className={`copy-btn ${mint ? 'mint' : ''}`} onClick={copy}>
      <Icon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Kopierat' : label}
    </button>
  );
}

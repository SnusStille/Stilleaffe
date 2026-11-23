'use client';

import type { SVGProps } from 'react';

export type IconName =
  | 'overview'
  | 'month'
  | 'team'
  | 'guide'
  | 'settings'
  | 'history'
  | 'stats'
  | 'goals'
  | 'comments'
  | 'ai'
  | 'logout'
  | 'refresh'
  | 'bell'
  | 'plus'
  | 'minus'
  | 'search'
  | 'copy'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'edit'
  | 'trash'
  | 'download'
  | 'arrow-up'
  | 'arrow-down'
  | 'sparkles'
  | 'clock'
  | 'calendar'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'x'
  | 'menu'
  | 'info'
  | 'alert'
  | 'trend'
  | 'award'
  | 'activity'
  | 'shield'
  | 'flame'
  | 'target'
  | 'wallet'
  | 'layers'
  | 'external'
  | 'save'
  | 'user'
  | 'mail'
  | 'phone'
  | 'home'
  | 'building'
  | 'star'
  | 'filter'
  | 'play'
  | 'pause'
  | 'reset'
  | 'arrow-right'
  | 'check-circle'
  | 'alert-circle'
  | 'bar-chart'
  | 'pie'
  | 'zap'
  | 'command'
  | 'keyboard'
  | 'volume'
  | 'square'
  | 'share'
  | 'bulb'
  | 'swords'
  | 'trophy'
  | 'sliders';

const PATHS: Record<IconName, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  month: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  team: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.2c2.5.3 4.5 2.4 4.5 5" /></>,
  guide: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" /><path d="M8 7h8M8 11h5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.07 4.24l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.2.55.72.95 1.31 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  stats: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="12" y="8" width="3" height="10" rx="1" /><rect x="17" y="4" width="3" height="14" rx="1" /></>,
  goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  comments: <><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.8-.8L3 21l1.9-5.2a8 8 0 0 1-1.4-4.3A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3z" /></>,
  ai: <><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /><path d="M5 16l.7 1.6L7.4 18l-1.7.7L5 20.4l-.7-1.7L2.6 18l1.7-.4z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 18l-6-6 6-6" />,
  'chevron-right': <path d="M9 18l6-6-6-6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>,
  'arrow-up': <path d="M12 19V5M5 12l7-7 7 7" />,
  'arrow-down': <path d="M12 5v14M19 12l-7 7-7-7" />,
  sparkles: <><path d="M12 3l1.8 4.4L18.2 9.2l-4.4 1.8L12 15.4l-1.8-4.4L5.8 9.2l4.4-1.8z" /><path d="M19 15l.8 1.9L21.7 18l-1.9.8L19 21l-.8-2.2L16.3 18l1.9-.9z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  'eye-off': <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4.3-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  x: <path d="M18 6L6 18M6 6l12 12" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>,
  award: <><circle cx="12" cy="8" r="5.5" /><path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5" /></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  shield: <><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  flame: <><path d="M12 22c4 0 7-2.7 7-6.5 0-4.8-4.2-6.3-3.2-11.5-2.3 1.2-3.8 3.1-4.2 5.2-.9-.9-1.4-2-1.5-3.3C8 8 5 10.5 5 15.5 5 19.3 8 22 12 22z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
  wallet: <><rect x="2" y="6" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none" /></>,
  layers: <><path d="M12 2l10 5.5-10 5.5L2 7.5z" /><path d="M2 12.5L12 18l10-5.5" /><path d="M2 17.5L12 23l10-5.5" /></>,
  external: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6M10 14L21 3" /></>,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2.5" /><path d="M22 7l-10 6L2 7" /></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></>,
  home: <><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>,
  star: <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z" />,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5z" />,
  play: <path d="M6 4l14 8-14 8z" />,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'check-circle': <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>,
  'alert-circle': <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>,
  'bar-chart': <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" rx="1" /><rect x="12" y="8" width="3" height="10" rx="1" /><rect x="17" y="4" width="3" height="14" rx="1" /></>,
  pie: <><path d="M21.2 15.9A10 10 0 1 1 8.1 2.8" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>,
  zap: <path d="M13 2L3 14h9l-1 8 10-12h-9z" />,
  command: <path d="M9 9V6a3 3 0 1 0-3 3h3zm0 0v6m0-6h6m-6 6v3a3 3 0 1 1-3-3h3zm6-6h3a3 3 0 1 0-3-3v3zm0 0v6m0 0h3a3 3 0 1 1-3 3v-3z" />,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2.5" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" /></>,
  volume: <><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  square: <rect x="6" y="6" width="12" height="12" rx="2" />,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>,
  bulb: <><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></>,
  swords: <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" />,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></>,
  sliders: <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />,
};

export function Icon({ name, size = 18, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

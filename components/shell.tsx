'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './app-provider';
import { BrandMark } from './brand';
import { Icon, type IconName } from './icons';
import { Modal } from './ui';
import { EntryForm } from './entry-form';
import { dateLabel, todayISO } from '@/lib/calc';

type NavItem = { href: string; label: string; icon: IconName };

const MAIN: NavItem[] = [
  { href: '/', label: 'Översikt', icon: 'overview' },
  { href: '/month', label: 'Månadsresultat', icon: 'month' },
  { href: '/team', label: 'Team', icon: 'team' },
  { href: '/guide', label: 'Spelguide', icon: 'guide' },
  { href: '/settings', label: 'Inställningar', icon: 'settings' },
];

const TOOLS: NavItem[] = [
  { href: '/history', label: 'Historik', icon: 'history' },
  { href: '/stats', label: 'Statistik', icon: 'stats' },
  { href: '/goals', label: 'Mål', icon: 'goals' },
  { href: '/comments', label: 'Kommentarer', icon: 'comments' },
  { href: '/ai', label: 'AI-coach', icon: 'ai' },
];

const TITLES: Record<string, string> = {
  '/': 'Översikt',
  '/month': 'Månadsresultat',
  '/team': 'Team',
  '/guide': 'Spelguide',
  '/settings': 'Inställningar',
  '/history': 'Historik',
  '/stats': 'Statistik',
  '/goals': 'Mål',
  '/comments': 'Kommentarer',
  '/ai': 'AI-coach',
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, reload, toast, motionMode } = useApp();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let on = true;
    const load = () => {
      fetch('/api/comments', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((j) => { if (on && typeof j.unread === 'number') setUnread(j.unread); })
        .catch(() => {});
    };
    load();
    const t = window.setInterval(load, 45_000);
    return () => { on = false; window.clearInterval(t); };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isSeller = me.role === 'seller';
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
    toast('Siffrorna är uppdaterade.');
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    router.replace('/login?e=logged_out');
    router.refresh();
  }

  return (
    <div className="app-shell" data-motion={motionMode}>
      <aside className="sidebar" aria-label="Huvudnavigation">
        <div className="sidebar_brand">
          <BrandMark size={38} />
          <div>
            <div className="brand-name">LABEL <span className="lab">LAB</span></div>
            <div className="brand-sub">SALES PERFORMANCE</div>
          </div>
        </div>
        <div className="nav-group">
          {MAIN.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? 'on' : ''}`} aria-current={active(item.href) ? 'page' : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="nav-label">Fler verktyg</div>
        <div className="nav-group">
          {TOOLS.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? 'on' : ''}`} aria-current={active(item.href) ? 'page' : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.href === '/comments' && unread > 0 && <span className="nav-badge">{unread}</span>}
            </Link>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <div className="sidebar-user">
          <div className={`avatar ${isSeller ? '' : 'manager'}`}>{me.display_name.slice(0, 1)}</div>
          <div>
            <div className="u-name">{me.display_name}</div>
            <div className="u-role">{isSeller ? 'Säljare' : 'Chef'} · @{me.username}</div>
          </div>
          <button className="u-logout" onClick={logout} title="Logga ut" aria-label="Logga ut">
            <Icon name="logout" size={15} />
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-only" aria-label="Meny" onClick={() => setMenuOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="mobile-brand">
              <BrandMark size={28} />
              <span className="brand-name" style={{ fontSize: 12 }}>LABEL <span className="lab">LAB</span></span>
            </div>
            <span className="topbar-title">{TITLES[pathname] || 'Label Lab'}</span>
            <span className="topbar-sep">/</span>
            <span className="topbar-date">{dateLabel(todayISO())}</span>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" onClick={refresh} aria-label="Uppdatera" title="Uppdatera siffrorna">
              <Icon name="refresh" size={16} style={{ opacity: refreshing ? 0.4 : 1, transform: refreshing ? 'rotate(180deg)' : undefined, transition: 'transform .4s' }} />
            </button>
            {isSeller && (
              <button className="btn btn-primary btn-sm" onClick={() => setRegisterOpen(true)}>
                <Icon name="plus" size={14} /> Registrera
              </button>
            )}
            <Link href="/comments" className="icon-btn" aria-label={unread ? `Kommentarer, ${unread} olästa` : 'Kommentarer'} title="Kommentarer">
              <Icon name="comments" size={16} />
              {unread > 0 && <span className="dot" />}
            </Link>
            <button className="icon-btn mobile-only" onClick={() => setMenuOpen(true)} aria-label="Alla verktyg" title="Alla verktyg">
              <Icon name="menu" />
            </button>
          </div>
        </header>

        <main className="page" id="main">{children}</main>
      </div>

      <Modal open={registerOpen} onClose={() => setRegisterOpen(false)} title="Registrera dagens resultat" width={720}>
        <EntryForm onSaved={() => setRegisterOpen(false)} onCancel={() => setRegisterOpen(false)} />
      </Modal>

      {menuOpen && (
        <div className="modal-backdrop" style={{ alignItems: 'stretch', padding: 0 }} onClick={() => setMenuOpen(false)}>
          <div style={{ width: 'min(360px, 86vw)', background: 'linear-gradient(170deg,#12181f,#0a0e13)', borderRight: '1px solid var(--bd)', padding: 22, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="row-between" style={{ marginBottom: 18 }}>
              <div className="brand-name" style={{ fontSize: 14 }}>LABEL <span className="lab">LAB</span></div>
              <button className="modal-x" onClick={() => setMenuOpen(false)} aria-label="Stäng"><Icon name="x" size={16} /></button>
            </div>
            <div className="nav-label" style={{ paddingLeft: 0 }}>Huvudnavigation</div>
            <div className="stack" style={{ gap: 2 }}>
              {MAIN.map((item) => (
                <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? 'on' : ''}`}>
                  <Icon name={item.icon} /> <span>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="nav-label" style={{ paddingLeft: 0, marginTop: 16 }}>Fler verktyg</div>
            <div className="stack" style={{ gap: 2 }}>
              {TOOLS.map((item) => (
                <Link key={item.href} href={item.href} className={`nav-item ${active(item.href) ? 'on' : ''}`}>
                  <Icon name={item.icon} /> <span>{item.label}</span>
                </Link>
              ))}
            </div>
            <div className="divider" />
            <div className="sidebar-user" style={{ marginBottom: 8 }}>
              <div className={`avatar ${isSeller ? '' : 'manager'}`}>{me.display_name.slice(0, 1)}</div>
              <div>
                <div className="u-name">{me.display_name}</div>
                <div className="u-role">{isSeller ? 'Säljare' : 'Chef'} · @{me.username}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-block" onClick={logout}>
              <Icon name="logout" size={15} /> Logga ut
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

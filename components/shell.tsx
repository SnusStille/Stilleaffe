'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './app-provider';
import { BrandMark } from './brand';
import { Icon, type IconName } from './icons';
import { EntryForm } from './entry-form';
import { Modal } from './ui';
import { CommandPalette } from './command-palette';
import { ShortcutsModal } from './shortcuts';
import { useQuickPlus } from './use-quick-plus';
import { buildCommands, commandsFor, type Command } from '@/lib/command';
import { buildShareText, buildWeeklyDigest } from '@/lib/report';
import { dateLabel, fmt, todayISO } from '@/lib/calc';
import type { Entry } from '@/lib/types';

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

function isMac() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
}

function isTypingTarget(el: EventTarget | null) {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    me, data, reload, toast, motionMode, sound, setSound, setMotionMode,
    register, openRegister, closeRegister, paletteOpen, setPaletteOpen, helpOpen, setHelpOpen,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { plus, busy: plussing } = useQuickPlus();

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

  const commands = useMemo(() => commandsFor(buildCommands(), me.role), [me.role]);

  async function refresh(quiet = false) {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
    if (!quiet) toast('Siffrorna är uppdaterade.');
  }

  function sanitizedMembers() {
    return (data?.team || []).map((t) => ({
      ...t,
      entries: t.entries.map((e) => ({ ...e, note: null, rating: null, mood: null, tags: [] })) as Entry[],
    }));
  }

  async function copyToClipboard(text: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMessage);
    } catch {
      toast('Kunde inte kopiera automatiskt.', 'err');
    }
  }

  async function copyReport() {
    if (!data) return toast('Ingen data att kopiera ännu.', 'err');
    const text = buildShareText(todayISO().slice(0, 7), sanitizedMembers(), me);
    await copyToClipboard(text, 'Månadsrapporten är kopierad — klistra in i WhatsApp eller Slack.');
  }

  async function copyWeekly() {
    if (!data) return toast('Ingen data att kopiera ännu.', 'err');
    const text = buildWeeklyDigest(sanitizedMembers(), me);
    await copyToClipboard(text, 'Veckobrevet är kopierat — klistra in i WhatsApp eller Slack.');
  }

  async function runCommand(c: Command) {
    switch (c.action.type) {
      case 'navigate': return router.push(c.action.href);
      case 'register': return openRegister({ date: c.action.date });
      case 'quick-plus': return void plus();
      case 'refresh': return void refresh();
      case 'copy-report': return void copyReport();
      case 'copy-weekly': return void copyWeekly();
      case 'toggle-sound': setSound(!sound); return toast(sound ? 'Ljudet är avstängt.' : 'Ljudet är påslaget.', 'info');
      case 'toggle-motion': {
        const next = motionMode === 'studio' ? 'quiet' : 'studio';
        setMotionMode(next);
        return toast(next === 'studio' ? 'Studio-läge: full rörelse.' : 'Tyst läge: inga animationer eller 3D.', 'info');
      }
      case 'shortcuts': return setHelpOpen(true);
      case 'guide-search': return router.push(`/guide?q=${encodeURIComponent(c.action.query)}`);
      case 'logout': return logout();
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    router.replace('/login?e=logged_out');
    router.refresh();
  }

  // Global shortcuts: ⌘/Ctrl+K anywhere; N / R / ? when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        setMenuOpen(false);
        return;
      }
      if (isTypingTarget(e.target) || mod || e.altKey) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setHelpOpen(!helpOpen);
      } else if (e.key === 'n' || e.key === 'N') {
        if (isSeller) { e.preventDefault(); openRegister(); }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void refresh();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeller, openRegister, setPaletteOpen, setHelpOpen, paletteOpen, helpOpen]);

  const todayRow = data?.myEntries.find((e) => e.entry_date === todayISO());
  const goals = data?.team.find((t) => t.username === me.username)?.goals;
  const todayPct = goals && todayRow ? Math.min(100, Math.round((Number(todayRow.sales) / Math.max(1, goals.daily_sales)) * 100)) : 0;

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
        {isSeller && goals && (
          <Link href="/" className="side-today" aria-label={todayRow ? `Idag ${todayRow.sales} av ${goals.daily_sales} sälj` : 'Idag ej registrerat'}>
            <div className="side-today-top">
              <span className="card-kicker">Idag</span>
              <b>{todayRow ? `${fmt(Number(todayRow.sales))} / ${fmt(goals.daily_sales)}` : 'Ej registrerat'}</b>
            </div>
            <div className="progress" style={{ marginTop: 7 }}><i style={{ width: `${todayPct}%` }} /></div>
          </Link>
        )}
        <button className="side-kbd" onClick={() => setPaletteOpen(true)} aria-label="Öppna kommandopalett (Ctrl+K)">
          <Icon name="search" size={14} />
          <span>Sök eller hoppa till…</span>
          <kbd className="kbd">{isMac() ? '⌘' : 'Ctrl'}</kbd><kbd className="kbd">K</kbd>
        </button>
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
            <button className="icon-btn" onClick={() => setPaletteOpen(true)} aria-label="Sök (Ctrl+K)" title="Sök eller hoppa till (Ctrl+K)">
              <Icon name="search" size={16} />
            </button>
            <button className="icon-btn" onClick={() => refresh()} aria-label="Uppdatera (R)" title="Uppdatera siffrorna (R)">
              <Icon name="refresh" size={16} className={refreshing ? 'spin-icon' : ''} />
            </button>
            {isSeller && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => openRegister()}>
                  <Icon name="plus" size={14} /> Registrera
                </button>
                <button className="icon-btn" onClick={() => plus()} disabled={plussing} aria-label="+1 sälj idag" title="+1 sälj idag">
                  <Icon name="zap" size={16} />
                </button>
              </>
            )}
            <Link href="/comments" className="icon-btn" aria-label={unread ? `Kommentarer, ${unread} olästa` : 'Kommentarer'} title="Kommentarer">
              <Icon name="comments" size={16} />
              {unread > 0 && <span className="dot" />}
            </Link>
            <button className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Kortkommandon (?)" title="Kortkommandon (?)">
              <Icon name="keyboard" size={16} />
            </button>
          </div>
        </header>

        <main className="page" id="main">{children}</main>
      </div>

      {register && (
        <RegisterDialog
          date={register.date}
          entry={register.entry}
          onClose={closeRegister}
        />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} onRun={runCommand} />
      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {menuOpen && (
        <div className="modal-backdrop" style={{ alignItems: 'stretch', padding: 0 }} onClick={() => setMenuOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
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
                  {item.href === '/comments' && unread > 0 && <span className="nav-badge">{unread}</span>}
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


function RegisterDialog({ date, entry, onClose }: { date: string | null; entry: Entry | null; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={entry?.id ? 'Uppdatera registrering' : date && date !== todayISO() ? `Registrera ${dateLabel(date).toLowerCase()}` : 'Registrera dagens resultat'} width={720}>
      <EntryForm key={`${date || 'today'}-${entry?.id || 'new'}`} initial={entry} date={date || undefined} onSaved={onClose} onCancel={onClose} />
    </Modal>
  );
}


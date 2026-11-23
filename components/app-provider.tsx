'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DataPayload } from '@/lib/types';
import type { AuthUser } from '@/lib/types';

type ToastKind = 'ok' | 'err' | 'info';

type Ctx = {
  me: AuthUser;
  data: DataPayload | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  toast: (message: string, kind?: ToastKind) => void;
  toasts: { id: number; message: string; kind: ToastKind }[];
  sound: boolean;
  haptics: boolean;
  setSound: (v: boolean) => void;
  setHaptics: (v: boolean) => void;
  reducedMotion: boolean;
  motionMode: 'studio' | 'quiet';
  setMotionMode: (v: 'studio' | 'quiet') => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const [data, setData] = useState<DataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; kind: ToastKind }[]>([]);
  const [sound, setSoundState] = useState(true);
  const [haptics, setHapticsState] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionMode, setMotionModeState] = useState<'studio' | 'quiet'>('studio');
  const idRef = useRef(0);
  const alive = useRef(true);

  const toast = useCallback((message: string, kind: ToastKind = 'ok') => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { credentials: 'same-origin', cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Serverfel (${res.status})`);
      if (!alive.current) return;
      setData(json);
      setError(null);
    } catch (e: any) {
      if (alive.current) setError(e?.message || 'Kunde inte hämta data.');
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    const timer = window.setInterval(() => void reload(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  useEffect(() => {
    try {
      setSoundState(localStorage.getItem('ll_sound') !== '0');
      setHapticsState(localStorage.getItem('ll_haptics') !== '0');
      setMotionModeState(localStorage.getItem('ll_motion') === 'quiet' ? 'quiet' : 'studio');
    } catch {}
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(!!mq?.matches);
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);

  const setSound = useCallback((v: boolean) => {
    setSoundState(v);
    try { localStorage.setItem('ll_sound', v ? '1' : '0'); } catch {}
  }, []);
  const setHaptics = useCallback((v: boolean) => {
    setHapticsState(v);
    try { localStorage.setItem('ll_haptics', v ? '1' : '0'); } catch {}
  }, []);
  const setMotionMode = useCallback((v: 'studio' | 'quiet') => {
    setMotionModeState(v);
    try { localStorage.setItem('ll_motion', v); } catch {}
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      me: user,
      data,
      loading,
      error,
      reload,
      toast,
      toasts,
      sound,
      haptics,
      setSound,
      setHaptics,
      reducedMotion,
      motionMode,
      setMotionMode,
    }),
    [user, data, loading, error, reload, toast, toasts, sound, haptics, setSound, setHaptics, reducedMotion, motionMode, setMotionMode],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

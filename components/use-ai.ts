'use client';

import { useCallback, useState } from 'react';

export type Proposal = { id: string; tool: string; input: any };

export function useAi() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (messages: { role: 'user' | 'assistant'; content: string }[]): Promise<{ text: string; proposals: Proposal[] }> => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'AI är inte tillgänglig just nu.');
      const proposals = (json.proposals || []).map((p: any, i: number) => ({ ...p, id: `${Date.now()}-${i}` }));
      return { text: json.text || (proposals.length ? 'Jag har ett förslag.' : ''), proposals };
    } catch (e: any) {
      setError(e?.message || 'AI är inte tillgänglig just nu.');
      return { text: '', proposals: [] };
    } finally {
      setBusy(false);
    }
  }, []);

  return { ask, busy, error };
}

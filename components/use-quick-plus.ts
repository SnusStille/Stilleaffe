'use client';

import { useCallback, useState } from 'react';
import { useApp } from './app-provider';
import { todayISO } from '@/lib/calc';
import { beep } from '@/lib/audio';

/**
 * "+1 sälj" from anywhere: reads today's row, adds one, keeps split/TB/notes intact,
 * and never invents a product split for an unsplit day.
 */
export function useQuickPlus() {
  const { data, reload, toast, sound } = useApp();
  const [busy, setBusy] = useState(false);

  const plus = useCallback(async () => {
    if (busy) return;
    const today = todayISO();
    const row = data?.myEntries.find((e) => e.entry_date === today);
    const body: Record<string, unknown> = {
      action: 'upsert',
      entry_date: today,
      sales: (row?.sales || 0) + 1,
      tb_sek: row?.tb_sek || 0,
      hours: row?.hours ?? null,
      note: row?.note ?? null,
      mood: row?.mood ?? null,
      rating: row?.rating ?? null,
      tags: row?.tags || [],
    };
    if (row && (row.brandkollen_sales != null || row.konsumentkollen_sales != null)) {
      // Keep the split consistent: the extra sale goes to the product with the larger share.
      const brand = row.brandkollen_sales ?? 0;
      const kons = row.konsumentkollen_sales ?? 0;
      body.brandkollen_sales = brand + (brand >= kons ? 1 : 0);
      body.konsumentkollen_sales = kons + (brand >= kons ? 0 : 1);
      if (row.brandkollen_tb != null || row.konsumentkollen_tb != null) {
        body.brandkollen_tb = row.brandkollen_tb ?? 0;
        body.konsumentkollen_tb = row.konsumentkollen_tb ?? 0;
      }
    }
    setBusy(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast(json?.error || 'Kunde inte spara.', 'err');
      await reload();
      if (sound) beep(740, 0.08, 'triangle', 0.05);
      toast(`+1 sälj — ${body.sales} registrerade idag.`);
    } finally {
      setBusy(false);
    }
  }, [busy, data, reload, toast, sound]);

  return { plus, busy };
}

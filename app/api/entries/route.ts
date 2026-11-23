import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';
import { sessionFromRequest } from '@/lib/auth';
import { todayISO } from '@/lib/calc';

export const dynamic = 'force-dynamic';
const privateHeaders = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
  Pragma: 'no-cache',
};
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s, headers: privateHeaders });

const validDate = (d: unknown): d is string => {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = Date.parse(d + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === d;
};

const optionalInt = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
};

const optionalMoney = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : Number.NaN;
};

class DbUnavailable extends Error {}

/** The storage client is created lazily so input validation never depends on the database. */
function db(): ReturnType<typeof admin> {
  try {
    return admin();
  } catch (e: any) {
    throw new DbUnavailable(e?.message || 'okänt fel');
  }
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e: any) {
    if (e instanceof DbUnavailable) return err('Databasen är inte konfigurerad: ' + e.message, 503);
    console.error('[entries]', e);
    return err('Serverfel – försök igen.', 500);
  }
}

async function handle(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) return err('Inte inloggad', 401);
  if (session.role !== 'seller') return err('Bara säljaren kan ändra sina registreringar.', 403);

  let b: any;
  try {
    b = await req.json();
  } catch {
    return err('Ogiltig förfrågan');
  }

  const me = session.username;

  if (b.action === 'upsert') {
    const entry_date = String(b.entry_date || '');
    const sales = Number(b.sales);
    const tb = Number(b.tb_sek);
    const hours = b.hours === undefined ? undefined : b.hours == null || b.hours === '' ? null : Number(b.hours);
    const note = b.note === undefined ? undefined : b.note ? String(b.note).trim().slice(0, 500) : null;
    const mood = b.mood === undefined ? undefined : ['fire', 'great', 'ok', 'tired', 'bad'].includes(b.mood) ? b.mood : null;
    const rating = b.rating === undefined ? undefined : Number.isInteger(Number(b.rating)) && Number(b.rating) >= 1 && Number(b.rating) <= 5 ? Number(b.rating) : null;
    const tags = b.tags === undefined ? undefined : Array.isArray(b.tags) ? b.tags.filter((x: any) => typeof x === 'string').slice(0, 8).map((x: string) => x.slice(0, 30)) : [];

    const brandSales = optionalInt(b.brandkollen_sales);
    const konsSales = optionalInt(b.konsumentkollen_sales);
    const brandTb = optionalMoney(b.brandkollen_tb);
    const konsTb = optionalMoney(b.konsumentkollen_tb);

    if (!validDate(entry_date)) return err('Ogiltigt datum.');
    if (entry_date > todayISO()) return err('Du kan inte registrera försäljning för ett framtidsdatum.');
    if (!Number.isInteger(sales) || sales < 0) return err('Antal sälj måste vara ett heltal ≥ 0.');
    if (!Number.isFinite(tb) || tb < 0) return err('TB måste vara ett tal ≥ 0.');
    if (hours != null && !(hours >= 0 && hours <= 24)) return err('Timmar måste vara mellan 0 och 24.');
    if ([brandSales, konsSales, brandTb, konsTb].some((v) => v !== undefined && Number.isNaN(v as any))) return err('Ogiltig produktuppdelning.');
    if (brandSales != null || konsSales != null) {
      const sum = (brandSales ?? 0) + (konsSales ?? 0);
      if (sum > sales) return err('Produktuppdelningen kan inte överstiga totalt antal sälj.');
    }
    if (brandTb != null || konsTb != null) {
      const sum = (brandTb ?? 0) + (konsTb ?? 0);
      if (sum > tb + 0.01) return err('Produktuppdelningen kan inte överstiga totalt TB.');
    }
    if (b.replace_id != null && (!Number.isSafeInteger(Number(b.replace_id)) || Number(b.replace_id) < 1)) return err('Ogiltigt id för den gamla registreringen.');

    const sb = db();
    const existed = await sb
      .from('sales_entries')
      .select('*')
      .eq('seller_username', me)
      .eq('entry_date', entry_date)
      .maybeSingle();
    if (existed.error) return err('Kunde inte läsa befintlig registrering: ' + existed.error.message, 500);

    const values: Record<string, unknown> = {
      seller_username: me,
      entry_date,
      sales,
      tb_sek: tb,
      hours: hours === undefined ? existed.data?.hours ?? null : hours,
      note: note === undefined ? existed.data?.note ?? null : note,
      mood: mood === undefined ? existed.data?.mood ?? null : mood,
      rating: rating === undefined ? existed.data?.rating ?? null : rating,
      tags: tags === undefined ? existed.data?.tags ?? [] : tags,
      brandkollen_sales: brandSales === undefined ? existed.data?.brandkollen_sales ?? null : brandSales,
      konsumentkollen_sales: konsSales === undefined ? existed.data?.konsumentkollen_sales ?? null : konsSales,
      brandkollen_tb: brandTb === undefined ? existed.data?.brandkollen_tb ?? null : brandTb,
      konsumentkollen_tb: konsTb === undefined ? existed.data?.konsumentkollen_tb ?? null : konsTb,
      updated_at: new Date().toISOString(),
    };
    // If one product is split, the other is an explicit zero rather than "unknown".
    if (values.brandkollen_sales != null || values.konsumentkollen_sales != null) {
      values.brandkollen_sales = values.brandkollen_sales ?? 0;
      values.konsumentkollen_sales = values.konsumentkollen_sales ?? 0;
    }
    if (values.brandkollen_tb != null || values.konsumentkollen_tb != null) {
      values.brandkollen_tb = values.brandkollen_tb ?? 0;
      values.konsumentkollen_tb = values.konsumentkollen_tb ?? 0;
    }

    const { error } = await sb.from('sales_entries').upsert(values, { onConflict: 'seller_username,entry_date' });
    if (error) {
      const hint = /duplicate key|unique constraint/i.test(error.message)
        ? ' Det finns redan en registrering för dig och datumet.'
        : '';
      return err(error.message + hint, 500);
    }

    const changed =
      !existed.data ||
      ['sales', 'tb_sek', 'hours', 'note', 'mood', 'rating', 'brandkollen_sales', 'konsumentkollen_sales', 'brandkollen_tb', 'konsumentkollen_tb'].some(
        (k) => String((existed.data as any)[k] ?? '') !== String(values[k] ?? ''),
      ) ||
      JSON.stringify(existed.data.tags || []) !== JSON.stringify(values.tags || []);

    if (changed) {
      try {
        await sb.from('sales_audit').insert({
          entry_date,
          action: existed.data ? 'update' : 'create',
          author: 'seller',
          actor_username: me,
          seller_username: me,
          before: existed.data
            ? {
                sales: existed.data.sales,
                tb_sek: existed.data.tb_sek,
                hours: existed.data.hours ?? null,
                note: existed.data.note ?? null,
                mood: existed.data.mood ?? null,
                rating: existed.data.rating ?? null,
                tags: existed.data.tags ?? [],
              }
            : null,
          after: {
            sales,
            tb_sek: tb,
            hours: values.hours ?? null,
            note: values.note ?? null,
            mood: values.mood ?? null,
            rating: values.rating ?? null,
            tags: values.tags ?? [],
          },
        });
      } catch {}
    }

    if (b.replace_id) {
      const { error: replaceError } = await sb
        .from('sales_entries')
        .delete()
        .eq('id', Number(b.replace_id))
        .eq('seller_username', me)
        .neq('entry_date', entry_date);
      if (replaceError) return err('Siffrorna sparades, men den gamla registreringen kunde inte tas bort: ' + replaceError.message, 500);
    }

    const prevSales = Number(existed.data?.sales || 0);
    try {
      if (!existed.data && sales >= 1) {
        await sb.from('activity_log').insert({ author: 'seller', actor_username: me, event: 'entry_new', payload: { entry_date, sales, tb } });
      } else if (existed.data && sales > prevSales) {
        await sb.from('activity_log').insert({ author: 'seller', actor_username: me, event: 'entry_updated', payload: { entry_date, sales, delta: sales - prevSales } });
      }
    } catch {}

    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  }

  if (b.action === 'delete') {
    const id = Number(b.id);
    if (!Number.isSafeInteger(id) || id < 1) return err('Ogiltigt id');
    const sb = db();
    const old = await sb.from('sales_entries').select('*').eq('id', id).eq('seller_username', me).maybeSingle();
    if (old.error) return err('Kunde inte läsa registreringen: ' + old.error.message, 500);
    if (!old.data) return err('Registreringen hittades inte.', 404);
    const { error } = await sb.from('sales_entries').delete().eq('id', id).eq('seller_username', me);
    if (error) return err('Kunde inte ta bort registreringen: ' + error.message, 500);
    try {
      await sb.from('sales_audit').insert({
        entry_date: old.data.entry_date,
        action: 'delete',
        author: 'seller',
        actor_username: me,
        seller_username: me,
        before: { sales: old.data.sales, tb_sek: old.data.tb_sek, hours: old.data.hours ?? null, note: old.data.note ?? null },
        after: null,
      });
    } catch {}
    return NextResponse.json({ ok: true }, { headers: privateHeaders });
  }

  return err('Okänd åtgärd');
}

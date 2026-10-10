import { NextResponse } from 'next/server';
import { admin } from '@/lib/secrets';

// Snabb server-klocka för polling/uppdatering och lista på inställningar.
export async function GET(req: Request) {
  const role = req.headers.get('x-role');
  if (role !== 'seller' && role !== 'manager') return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
  let settings: any = {};
  try {
    const { data } = await admin().from('app_settings').select('key,value');
    for (const r of data || []) {
      if (r.key === 'seller_password' || r.key === 'manager_password' || r.key === 'anthropic_api_key') continue;
      settings[r.key] = r.value;
    }
  } catch {}
  return NextResponse.json({ ok: true, serverNow: new Date().toISOString(), role, settings });
}

export async function POST(req: Request) {
  if (req.headers.get('x-role') !== 'seller') return NextResponse.json({ error: 'Bara säljaren' }, { status: 403 });
  let b: any; try { b = await req.json(); } catch { return NextResponse.json({ error: 'Ogiltig' }, { status: 400 }); }
  const k = String(b.key || ''); const v = String(b.value == null ? '' : b.value);
  if (!/^[a-z_]{2,40}$/.test(k)) return NextResponse.json({ error: 'Ogiltig nyckel' }, { status: 400 });
  if (k.startsWith('seller') || k.startsWith('manager') || k === 'anthropic_api_key') return NextResponse.json({ error: 'Reserverad nyckel' }, { status: 400 });
  if (!v) await admin().from('app_settings').delete().eq('key', k);
  else await admin().from('app_settings').upsert({ key: k, value: v });
  return NextResponse.json({ ok: true });
}

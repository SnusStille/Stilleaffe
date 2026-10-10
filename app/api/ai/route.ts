import { NextResponse } from 'next/server';
import { getKeys, admin } from '@/lib/secrets';
import { iso, workdaysLeft } from '@/lib/calc';

const hits = new Map<string, number[]>();
const TOOLS = [
  { name: 'registrera_dag', description: 'Föreslå att registrera/uppdatera säljresultat för ett datum (ersätter befintlig registrering för datumet). Användaren godkänner innan det sparas.', input_schema: { type: 'object', properties: { entry_date: { type: 'string', description: 'YYYY-MM-DD' }, sales: { type: 'integer' }, tb_sek: { type: 'number' }, hours: { type: 'number' }, note: { type: 'string' } }, required: ['entry_date', 'sales', 'tb_sek'] } },
  { name: 'satt_mal', description: 'Föreslå nya mål (ange bara de som ska ändras). Användaren godkänner innan det sparas.', input_schema: { type: 'object', properties: { daily_sales: { type: 'integer' }, daily_tb: { type: 'number' }, weekly_sales: { type: 'integer' }, weekly_tb: { type: 'number' }, monthly_sales: { type: 'integer' }, monthly_tb: { type: 'number' } } } },
  { name: 'skriv_kommentar', description: 'Föreslå ett meddelande till den andra personen (Stille eller Affe). Skickas först när användaren godkänner.', input_schema: { type: 'object', properties: { body: { type: 'string' }, entry_date: { type: 'string', description: 'valfritt YYYY-MM-DD' } }, required: ['body'] } },
];

export async function POST(req: Request) {
  const role = req.headers.get('x-role');
  if (role !== 'seller' && role !== 'manager') return NextResponse.json({ error: 'Inte inloggad' }, { status: 401 });
  const now = Date.now(), h = (hits.get(role) || []).filter(t => now - t < 600000);
  if (h.length >= 20) return NextResponse.json({ error: 'För många frågor – vänta en stund.' }, { status: 429 });
  h.push(now); hits.set(role, h);
  let keys: string[] = [];
  try { keys = await getKeys(); } catch { keys = []; }
  if (!keys.length) return NextResponse.json({ error: 'AI är inte aktiverad. Lägg in API-nyckeln i AI-fliken.' }, { status: 503 });

  let body: any = {}; try { body = await req.json(); } catch {}
  let msgs = (Array.isArray(body.messages) ? body.messages : []).filter((m: any) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-8).map((m: any) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return NextResponse.json({ error: 'Skriv en fråga.' }, { status: 400 });

  let sb: ReturnType<typeof admin>;
  try { sb = admin(); } catch (e: any) { return NextResponse.json({ error: 'Databasen är inte korrekt kopplad: ' + (e?.message || 'okänt fel') }, { status: 500 }); }
  const since = iso(new Date(now - 60 * 864e5));
  const [rows, g, cm] = await Promise.all([
    sb.from('sales_entries').select('entry_date,sales,tb_sek,hours,note').gte('entry_date', since).order('entry_date'),
    sb.from('goals').select('daily_sales,daily_tb,weekly_sales,weekly_tb,monthly_sales,monthly_tb').eq('id', 1).maybeSingle(),
    sb.from('comments').select('author,body,entry_date,created_at').order('id', { ascending: false }).limit(10),
  ]);
  const td = /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : iso(new Date()); // klientens datum (Vercel kör UTC)
  const data = { idag: td, veckodag: new Date(td + 'T12:00').toLocaleDateString('sv-SE', { weekday: 'long' }), arbetsdagar_kvar_i_manaden: Number.isInteger(body.wl) ? body.wl : workdaysLeft(), mal: g.data, registreringar_senaste_60_dagarna: rows.data || [], senaste_kommentarer: cm.data || [] };
  msgs[msgs.length - 1].content += `\n\n[AKTUELL DATA]\n${JSON.stringify(data)}`;

  const me = role === 'seller' ? 'Stille (säljaren)' : 'Affe (chefen, som följer Stilles resultat)';
  const system = `Du är en rak, konkret och lite tävlingsinriktad säljcoach i en privat dashboard. Du pratar just nu med ${me}. Stille säljer ID-skydd per telefon. Svara på svenska, kort (max ca 120 ord). Använd ENDAST siffror ur datan – hitta aldrig på. Är datan tunn (färre än ~5 registrerade dagar) ska du säga att slutsatserna är osäkra. TB = täckningsbidrag i kr. Ge konkreta förslag, aldrig generiska motivationsfraser eller nedlåtande ton. Du kan använda verktygen för att FÖRESLÅ ändringar; inget sparas förrän användaren godkänner, så säg kort vad du föreslår. Kommentarer skrivs i användarens namn.`;
  const tools = role === 'seller' ? TOOLS : TOOLS.filter(t => t.name === 'skriv_kommentar');

  try {
    const payload = JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 700, system, tools, messages: msgs });
    let r!: Response;
    for (const k of keys) {
      r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }, body: payload });
      if (r.status !== 401) break; // ogiltig/avstängd nyckel – prova nästa om det finns en
    }
    if (!r.ok) {
      let detail = ''; try { const ej = await r.json(); detail = String(ej?.error?.message || '').slice(0, 160); } catch {}
      const msg = r.status === 401 ? 'API-nyckeln är ogiltig eller avstängd. Skapa en ny på console.anthropic.com och lägg in den i AI-fliken eller i Vercel (ANTHROPIC_API_KEY).'
        : r.status === 404 ? 'Modellen hittades inte. Kontrollera ANTHROPIC_MODEL i Vercel (nu: ' + (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5') + ').'
        : r.status === 429 ? 'Anthropic begränsar anropen just nu – försök igen strax.'
        : /credit|balance|billing/i.test(detail) ? 'Kontot saknar kredit hos Anthropic. Fyll på under Plans & Billing.'
        : `AI-anropet misslyckades (${r.status}). ${detail}`.trim();
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const j = await r.json(), blocks: any[] = j.content || [];
    const text = blocks.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    const proposals = blocks.filter(c => c.type === 'tool_use' && tools.some(t => t.name === c.name)).map(c => ({ tool: c.name, input: c.input }));
    return NextResponse.json({ text, proposals });
  } catch { return NextResponse.json({ error: 'AI är inte tillgänglig just nu.' }, { status: 502 }); }
}

import { NextResponse } from 'next/server';
import { keyStatus, setKey, delKey } from '@/lib/secrets';
// Skyddas av middleware. Bara säljaren ändrar nyckeln. Returnerar aldrig själva nyckeln.
const deny = () => NextResponse.json({ error: 'Bara säljaren kan ändra nyckeln.' }, { status: 403 });
export async function GET() { return NextResponse.json(await keyStatus()); }
export async function POST(req: Request) {
  if (req.headers.get('x-role') !== 'seller') return deny();
  const { key } = await req.json();
  if (typeof key !== 'string' || !key.trim().startsWith('sk-ant-')) return NextResponse.json({ error: 'Ogiltig nyckel (ska börja med sk-ant-)' }, { status: 400 });
  const { error } = await setKey(key.trim());
  if (error) return NextResponse.json({ error: 'Kunde inte spara: ' + error.message }, { status: 500 });
  return NextResponse.json(await keyStatus());
}
export async function DELETE(req: Request) { if (req.headers.get('x-role') !== 'seller') return deny(); await delKey(); return NextResponse.json(await keyStatus()); }

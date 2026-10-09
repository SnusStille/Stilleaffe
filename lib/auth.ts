// Edge- och Node-säker (Web Crypto). Token = HMAC(lösenord, roll). Ändras lösenordet ogiltigförklaras sessionen.
export type Role = 'seller' | 'manager';
export const pwFor = (r: string) => {
  const raw = r === 'seller' ? process.env.SELLER_PASSWORD : r === 'manager' ? process.env.MANAGER_PASSWORD : undefined;
  const pw = (raw || '').trim();
  // Returnera undefined om lösenord saknas/för kort – då kraschar inte Web Crypto.
  return pw.length >= 1 ? pw : undefined;
};
export async function token(pw: string, role: string) {
  const keyBytes = new TextEncoder().encode(pw || '__empty__fallback__');
  // Web Crypto tillåter inte noll-långa HMAC-nycklar. Fallback-strängen ovan förhindrar krasch
  // samtidigt som den ger ett konsekvent, omatchbart token när lösenord saknas.
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('sd-session-v2:' + role));
  return Array.from(new Uint8Array(s)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Edge- och Node-säker (Web Crypto). Token = HMAC(lösenord, roll). Ändras lösenordet ogiltigförklaras sessionen.
export type Role = 'seller' | 'manager';
export const pwFor = (r: string) => (r === 'seller' ? process.env.SELLER_PASSWORD : r === 'manager' ? process.env.MANAGER_PASSWORD : undefined);
export async function token(pw: string, role: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('sd-session-v2:' + role));
  return Array.from(new Uint8Array(s)).map(b => b.toString(16).padStart(2, '0')).join('');
}

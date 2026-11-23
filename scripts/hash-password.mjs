#!/usr/bin/env node
// Genererar ett scrypt-hashat lösenord för Label Lab.
//
//   node scripts/hash-password.mjs "DittLosenord"
//
// Klistra in hela utmatningen (scrypt:...) som värde i Vercel Secrets:
//   STILLE_PASSWORD, AFFE_PASSWORD, FREDLAND_PASSWORD, KVIST_PASSWORD
// Lösenord får aldrig finnas i Git, SQL eller klientkod.
import { randomBytes, scryptSync } from 'node:crypto';

const plain = process.argv[2];
if (!plain || plain.length < 8) {
  console.error('Användning: node scripts/hash-password.mjs "<lösenord med minst 8 tecken>"');
  process.exit(1);
}
// Keep the format identical to lib/auth.ts (verifyPassword).
const N = 16384, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(plain, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 });
const stored = `scrypt:${N}:${r}:${p}:${salt.toString('hex')}:${hash.toString('hex')}`;
console.log(stored);

// Self-check with the same verifier logic used by the app.
const verify = (candidate) => {
  const [, n, rr, pp, saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(candidate, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(n), r: Number(rr), p: Number(pp), maxmem: 64 * 1024 * 1024 });
  return expected.length === actual.length && expected.equals(actual);
};
if (!verify(plain)) {
  console.error('Verifieringen misslyckades – använd inte utmatningen.');
  process.exit(1);
}
console.error('OK – hashen verifierar mot det angivna lösenordet.');

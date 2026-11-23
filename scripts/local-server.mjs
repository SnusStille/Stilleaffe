#!/usr/bin/env node
// Local helper: load KEY=VALUE lines from .env.local WITHOUT shell/dotenv expansion
// (scrypt hashes contain `$`), then start the built app together with the mock
// Supabase backend. Test/development only — production secrets live in Vercel.
//
//   node scripts/local-server.mjs          # next start on :3000 + mock on :54321
import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line)) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) process.env[key] = value;
  }
}
process.env.SUPABASE_SECRET_KEY ||= 'sb_secret_mock';
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SESSION_SECRET ||= 'local-dev-session-secret-0123456789abcdefghijklmnop';

const mock = spawn(process.execPath, [path.join(root, 'scripts/mock-supabase.mjs')], { stdio: 'inherit' });
const app = spawn('npx', ['next', 'start', '-p', process.env.PORT || '3000', '-H', '0.0.0.0'], { cwd: root, stdio: 'inherit', env: process.env });
const shutdown = () => { mock.kill(); app.kill(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
app.on('exit', (c) => { mock.kill(); process.exit(c ?? 0); });

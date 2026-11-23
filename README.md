# LABEL LAB · Sales Performance

Privat säljuppföljning för Label Lab (partner till ViPo Säkerhetstjänster). Next.js 15 + Supabase,
fyra konton med rollbaserad åtkomst, registrering per säljare och dag, produktuppdelning
(Brandkollen / Konsumentkollen), månadsöversikt med takt och prognos, Spelguide, AI-coach
(`claude-sonnet-5-5`) och en Dark Glass-design med 3D-scener som aldrig är i vägen för flödet.

## Snabbstart lokalt (Node.js 22.x)

1. `npm install`
2. Kopiera `.env.example` till `.env.local` och fyll i variablerna.
3. Kör **en** av SQL-filerna i Supabase Dashboard → SQL Editor:
   - befintlig databas (Stilleaffe v7/v8): `supabase/migrations/20261123000000_label_lab_multi_user.sql`
   - ny, tom databas: `supabase/schema.sql`
4. `npm run dev` → http://localhost:3000

Utan Supabase? `npm run build && node scripts/local-server.mjs` startar appen mot en in-memory
mock (`scripts/mock-supabase.mjs`) med testdata och testlösenord (`StilleTest2026!` osv. – se `.env.local`-exempel
i `scripts/e2e-local.sh`).

## Konton och roller

| Användarnamn | Roll | Miljövariabel (Vercel Secret) |
| --- | --- | --- |
| `stille` | säljare | `STILLE_PASSWORD` (äldre `SELLER_PASSWORD` fungerar under övergången) |
| `affe` | chef | `AFFE_PASSWORD` (äldre `MANAGER_PASSWORD`) |
| `fredland` | chef – exakt samma rättigheter och vyer som Affe | `FREDLAND_PASSWORD` |
| `kvist` | säljare – exakt samma rättigheter och vyer som Stille | `KVIST_PASSWORD` |

- Rollen hämtas från `app_users` på servern. Det finns ingen rollväljare och klienten kan inte påverka den.
- Lösenord lagras **endast** som scrypt-hashar i Vercel Secrets: `npm run hash-password "lösenord"`.
  Formatet `scrypt:N:r:p:salt:hash` innehåller inga `$` och är säkert i `.env.local`. Klartext accepteras
  bara för en kort övergångsperiod.
- Sessionen är en HMAC-signerad HttpOnly-cookie (`ll_session`, SameSite=Lax, Secure i produktion, 12 h).
  Inloggningar begränsas till 6 fel per användare/IP per 10 minuter.
- Chefer ser hela teamet men kan aldrig ändra säljares registreringar eller mål – inte heller via AI.

## Miljövariabler (Vercel → Settings → Environment Variables)

| Variabel | Beskrivning |
| --- | --- |
| `STILLE_PASSWORD`, `AFFE_PASSWORD`, `FREDLAND_PASSWORD`, `KVIST_PASSWORD` | scrypt-hashar, en per konto |
| `SESSION_SECRET` | ≥ 32 slumpmässiga tecken (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` (eller legacy `SUPABASE_SERVICE_ROLE_KEY` med role=service_role) |
| `ANTHROPIC_API_KEY` | valfri – AI-coachen är av utan nyckel |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` (byts inte) |

Service-nyckeln används bara på servern. RLS är på, `anon`/`authenticated` har inga rättigheter,
och varje API-route kontrollerar session + roll + identitet på egen hand.

## Datamodell

`app_users` · `user_goals` (en rad per säljare) · `sales_entries` (unik per `seller_username + entry_date`,
produktfält `brandkollen_*` / `konsumentkollen_*`, `NULL` = *Ej uppdelat*) · `comments` · `activity_log` ·
`sales_audit` · `achievements` (per användare) · `guide_overrides` · `app_settings` · legacy `goals` (behålls för kompatibilitet).

Regler som koden och testerna garanterar:

- En dag **utan** registrering är aldrig noll. En registrerad dag med 0 sälj är en riktig nolla.
- Prognos visas först med ≥ 5 registrerade arbetsdagar och ≥ 70 % täckning av passerade arbetsdagar.
- Månadsjämförelse för pågående månad använder samma kalenderperiod förra månaden.
- Endast säljare rankas. Chefer syns i tabeller men inte i rankingen.
- Alla datum beräknas i Europe/Stockholm med svenska helgdagar.

## Struktur

```
app/
  (app)/                 Översikt, Månadsresultat, Team, Spelguide, Inställningar, Historik, Statistik, Mål, Kommentarer, AI-coach
  login/                 Inloggning med 3D-scen "THE LABEL CORE" (fallback utan WebGL/reduced motion)
  api/                   login, logout, data, entries, goals, comments, guide, achievements, audit, settings, ai, health
components/              shell, ui-kit, entry-form, comments-thread, three/ (login-scene, performance-engine, scene-boundary)
lib/                     calc (all statistik), auth, session, users, coach, audio, guide/ (Spelguide-innehåll)
supabase/                schema.sql (nytt projekt) + migrations/ (uppgradering, upprepningsbar)
scripts/                 hash-password, mock-supabase, local-server, e2e-local
tests/                   vitest: beräkningar, behörigheter, sessioner, Spelguide
```

## Kvalitet

```bash
npm run typecheck   # tsc --noEmit
npm test            # 56 tester: datum/kalender, takt & prognos, ranking, produktuppdelning, CSV, scrypt, sessioner, route-behörighet, Spelguide
npm run build
bash scripts/e2e-local.sh   # mot lokal server + mock: alla fyra inloggningar, Fredland == Affe, Kvist == Stille, samma datum för två säljare, RLS på route-nivå
```

`/api/health` visar liveness publikt (`ok`, `db`, `v`) och miljö/tabellstatus endast för chefer.

## Spelguide och produktfakta

`lib/guide/content.ts` innehåller manuset för Brandkollen och Konsumentkollen med öppning, behovsanalys,
presentation, fördelar, avslut, 22 invändningar med egna rubriker, konkurrens, loop och FAQ. Chefer kan
redigera avsnitt (sparas i `guide_overrides` med upphovsperson och tid). Varje avsnitt är märkt
*Officiell produktinformation*, *Internt säljargument* eller **Kontrollera med ledning**. Priser och
jämförelser (UC, Mysafety, Verisure m.fl.) är alltid *Kontrollera med ledning* tills ledningen godkänt dem.
Aldrig löften om polisutryckning, myndighet eller garanterat skydd.

## Deployflöde

1. Push till feature-branch → Vercel Preview (sätt Secrets i Vercel innan preview-test).
2. Kör SQL-migreringen i Supabase (den är upprepningsbar).
3. Verifiera alla fyra inloggningar och vyerna i preview.
4. Först efter godkännande: merga till `main` (produktion).

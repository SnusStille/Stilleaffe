# Säljdashboard v7 — MAXAD

Privat svensk säljuppföljning för Stille & Affe. Next.js 15 + Supabase, med server-side auth, dags-/vecko-/månadsmål, humör, rating, taggar, aktivitetsflöde, AI-coach och statistik.

## Snabbstart lokalt

Använd Node.js 22.x.

1. `npm install`
2. Kopiera `.env.example` till `.env.local` och fyll i variablerna en och en.
3. Kör `supabase/schema.sql` i Supabase Dashboard → SQL Editor.
4. `npm run dev`

## V7

- Bättre, mobilvänlig navigering och paneler för humör-/tagginsikter.
- Live status i sidtitel och favicon, musföljande spotlight med pointer-events utan helsides-render per musrörelse.
- Tangentbordets kommandopalett: `⌘K` på Mac, `Ctrl+K` på Windows/Linux; piltangenter/Enter/Esc.
- Chime-ljud och haptisk feedback vid sparning och milstolpar, med separata på/av-reglage; vibrationsstöd beror på enheten/webbläsaren.
- 13 varaktiga märken som visas och firas vid upplåsning.
- Kommentar-reaktioner, pinning och korrekt olästa-räknare.
- SQL-migrering som fungerar från både v5- och v6-tabeller; upprepade körningar återställer inte sparade mål.
- Uppdaterade prognoser och jämförelser utifrån kalenderns faktiska arbetsdagar.

## Senaste förbättringar

- November Evolution: Mission Control med 60k/80k/100k TB-nivåer, dagsplan, täckningsmedveten prognos, pressure meter, actual-only Pace Map med explicita dataluckor, rekordjakt och lokal What If-simulator. AI Sales Analyst får upp till fem års kompakt historikunderlag. Monthly Review sammanställer faktisk månad, veckor, rekord och täckning. Morning Briefing har Resend, Vercel Cron, idempotens, leveranslogg, förhandsvisning och test-gate; utskicket förblir avstängt tills miljövariabler, SQL-migrering, domänverifiering, två mottagare och ett lyckat test finns. Se `NOVEMBER-EVOLUTION.md` för konfiguration och begränsningar.
- Säkerhet: Next.js uppdaterad från 15.5.27 till 15.5.28 efter npm audit; audit är ren.
- V20–V23: login-hero med tydligare Wall Street-inspirerad bildrörelse, fördjupad 3D i båda rollernas vyer, valbart Studio/Lugn-läge och ett nytt notiscenter i navigeringen (inte längre uppe i sidans högra hörn). Inloggningsanimationerna följer `prefers-reduced-motion`. Se `LOGIN-REDESIGN.md` och `DESIGN-v21.md`–`DESIGN-v23.md`.
- Tydlig, rollanpassad översikt: Stille får dagens mål och nästa steg; Affe får en skrivskyddad chefsbild med veckomål och trend endast på jämförbara registrerade vardagar.
- Saknade registreringar visas separat från faktiska nollor. Månadssammanfattningen jämför samma hittillsvarande kalenderperiod och visar registrerade dagar.
- Säljaren kan få högst en automatiserad, datagrundad AI-nudge per lokal dag när månadstakten eller dagens resultat halkar efter. Den kan stängas av i Inställningar; saknade rader behandlas inte som noll, och verktyg skickar bara förslag som användaren själv godkänner.
- Databasfel har tydligare åtgärder: försök igen och öppna `/api/health`.
- Se `FEATURE-REVIEW.md` för prioritering av tolv funktioner, omfattning och uppskattad insats.
- Frontend beroenden är uppdaterade till Next.js 15.5.27 och PostCSS 8.5.29; kör `npm run build` före deploy.

## Deploya till Vercel

Kopiera filerna till repot `SnusStille/Stilleaffe`, committa och pusha; Vercel auto-deployar. Läs `UPGRADE-v7.md` för SQL- och Vercel-stegen.

**Byt inte Anthropic-modellnamnet**: appen använder `ANTHROPIC_MODEL=claude-sonnet-5-5`.

## Miljövariabler

Appen behöver dessa servervariabler:

- `SELLER_PASSWORD`
- `MANAGER_PASSWORD`
- `SESSION_SECRET` (valfri; minst 32 slumpmässiga tecken rekommenderas. Om den saknas härleds sessionsnyckeln från lösenorden.)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (föredragen, `sb_secret_...`) **eller** befintliga `SUPABASE_SERVICE_ROLE_KEY` (legacy `service_role` JWT); om båda sätts prioriteras `SUPABASE_SECRET_KEY`
- `ANTHROPIC_API_KEY` (valfri om AI inte ska användas)
- `ANTHROPIC_MODEL=claude-sonnet-5-5`
- `RESEND_API_KEY` (valfri; server-side för Morning Sales Briefing)
- `CRON_SECRET` (minst 32 slumpmässiga tecken; krävs för det skyddade Vercel Cron-utskicket)

Morning Briefing kräver också `supabase/migration-morning-briefing.sql`, verifierad domän `stilledev.se` hos Resend, två sparade mottagare och ett lyckat testmejl innan aktivering. Se `NOVEMBER-EVOLUTION.md`.

Endast en servernyckel med rätt projekt får användas: en `sb_secret_...` eller legacy JWT med `role=service_role`. `anon`/`sb_publishable_...` fungerar inte som adminnycklar. Lägg aldrig någon servernyckel i en `NEXT_PUBLIC_...`-variabel eller i klientkod.

## Lokal verifiering

- `npm test` kör deterministiska tester för Morning Briefing-beräkningar, skydd mot att saknade dagar räknas som noll, e-postrendering och Stockholm-tidszon/cron-retries.
- `npx tsc --noEmit` och `npm run build` kontrollerar typer och produktionsbygge.

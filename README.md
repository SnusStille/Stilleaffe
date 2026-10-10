# Säljdashboard v7 — MAXAD

Privat svensk säljuppföljning för Stille & Affe. Next.js 14 + Supabase, med server-side auth, dags-/vecko-/månadsmål, humör, rating, taggar, aktivitetsflöde, AI-coach och statistik.

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

## Deploya till Vercel

Kopiera filerna till repot `SnusStille/Stilleaffe`, committa och pusha; Vercel auto-deployar. Läs `UPGRADE-v7.md` för SQL- och Vercel-stegen.

**Byt inte Anthropic-modellnamnet**: appen använder `ANTHROPIC_MODEL=claude-sonnet-5-5`.

## Miljövariabler

Appen behöver dessa servervariabler:

- `SELLER_PASSWORD`
- `MANAGER_PASSWORD`
- `SESSION_SECRET` (minst 32 slumpmässiga tecken rekommenderas)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (föredragen, `sb_secret_...`) **eller** befintliga `SUPABASE_SERVICE_ROLE_KEY` (legacy `service_role` JWT); om båda sätts prioriteras `SUPABASE_SECRET_KEY`
- `ANTHROPIC_API_KEY` (valfri om AI inte ska användas)
- `ANTHROPIC_MODEL=claude-sonnet-5-5`

Endast en servernyckel med rätt projekt får användas: en `sb_secret_...` eller legacy JWT med `role=service_role`. `anon`/`sb_publishable_...` fungerar inte som adminnycklar. Lägg aldrig någon servernyckel i en `NEXT_PUBLIC_...`-variabel eller i klientkod.

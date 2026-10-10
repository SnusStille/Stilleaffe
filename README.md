# Säljdashboard — v5 🚀
Next.js 14 · Supabase (endast server) · Claude AI-coach · PWA · 5 teman · Årsvy · Byt-lösenord inifrån appen.

## 🆕 Nytt i v5
### 🔐 Säkerhet & pålitlighet
- **Helt ny auth (inga fler hash-mismatch som tidigare):** cookie `v5.<roll>.<HMAC-SHA256>`.
  Signeras med en SESSION_SECRET (eller fallback-härledd från lösenorden). Edge/Node ger alltid samma hash.
- **Lösenord kan bytas inifrån appen** (Inställningar). Kräver nuvarande lösenord.
- **Databas-lagrade lösenord** åsidosätter miljövariablerna när de byts via appen (med 10s cache).
- Rate limit: 10 försök / 10 min / IP (bättre meddelanden).
- Hela middlewaren i try/catch med vettiga fel istället för 500-loop.
- Tomt/felaktigt lösenord → 401 med `{error:"pw"}` (inte 500).
- Skyddad `/api/settings` för dynamiska inställningar.

### 🎨 Design (x1000)
- **5 teman** (Sälj/grön, Midnatt/blå-lila, Sunset/orange-rosa, Forest/grön-gul, Neon/rosa-cyan) som man väljer i Inställningar. Valet sparas i `localStorage`.
- Helt nytt CSS-variabel-system som styr alla färger per tema.
- Ny gradient-aurora med gröna/blå/lila blobs som anpassar sig efter temat.
- Vackra ring-diagram med gradient, förbättrad skuggbild, gridmönsterbakgrund, snyggare scrollbars.
- Ny sidonav med ikonkolumn (som döljer etiketter på mobil), notis-badge intill "Kommentarer".
- Brödfisksliknande chip i toppen som visar aktiv flik + roll.
- Nytt "Välkommen"-hälsning (God morgon/Hej/God kväll) + dagens datum med stor bokstav.
- Välgjord Year-heatmap (GitHub-stil) med förklaring.
- Konfetti med slumpmässig rotation och spridning.
- Snyggare formulär, tabeller med TB/sälj-kolumn, hover-effekter, bättre knappar (sm/danger/pri/ghost/icon).
- Skeleton-laddning, tydligare felruta, bättre fokusringar (`:focus-visible`), tillgänglighet (`aria-label`, `aria-pressed`, `aria-busy`, `role="status"`).
- Nyårs-achievement-badges (10 dagar i rad, 15+ sälj på en dag).

### ⚙️ Nya funktioner
- **Ny flik: Årsvy** – 365-dagars GitHub-style heatmap + staplar per månad (senaste 12 månaderna), KPI: årets sälj/TB, längsta streak, antal dagar.
- **Ny flik: Inställningar** – temaväljare, byt lösenord, hälsokontroll, logga ut.
- **Byt lösenord i appen** (både Stille och Affe).
- **Jämfört med förra månaden** (sälj och TB med siffra + procent upp/ner).
- **Rekord-kort** (flest sälj på en dag, högsta TB på en dag).
- TB/sälj kolumn i historiken, TB-per-dag i översikt, timmar/snitt per dag i statistik.
- Ny statistik: "Krävs/dag", "Snitt timmar/dag".
- Notiser stängs när man klickar utanför.
- CSV med semikolon + BOM (Excel på svenska läser å/ä/ö korrekt).
- Snabb "+1 sälj"-knapp bevarar nu anteckning och timmar från tidigare dag.
- Konfirmering innan man loggar ut.
- Nya AI-förvalsfrågor ("Peppa mig").
- Sidmenyn får 9 flikar totalt.
- Ny server-klocka via `/api/settings` inför framtida realtids-uppdateringar.
- Bättre feldiagnostik: /api/health ger nu version och `dbDetail` (exakt Supabase-fel).
- Bättre shim-lager mot Supabase så ogiltig URL inte kraschar servern.

### 🐛 Buggfixar utöver login
- Supabase `admin()`-klient skapades om per anrop men hanterade inte felaktig URL → ny shim med tydligt felmeddelande.
- Claude-modellnamnet var fel (`claude-sonnet-5-5` → `claude-3-5-sonnet-latest`).
- `Range/daysLeft` i `calc.ts` returnerade 0 när det var noll dagar kvar (orsakade division med noll) → `Math.max(...,1)`.
- `avg/sum/pbDay/pbTB/bestStreak/groupByMonth/quarter` hjälpfunktioner tillagda.
- Vid date input i registreringsformuläret var date default korrekt (`today()`).
- Toast position bättre på mobil (ovanpå navet).
- Mobile bottom-nav visar bara ikoner (inte text) för att få plats med 9 flikar.
- Klock-popup kan scrollas och har bättre positionering.

## Kom igång
1. Supabase: skapa projekt, kör `supabase/schema.sql` i SQL Editor.
2. `.env.local` (kopiera från `.env.example`):
   - `SELLER_PASSWORD` / `MANAGER_PASSWORD`
   - `NEXT_PUBLIC_SUPABASE_URL` (endast `https://xxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (valfritt, slumpa ≥8 tecken)
   - `ANTHROPIC_API_KEY` (valfritt)
   - `ANTHROPIC_MODEL=claude-3-5-sonnet-latest`
3. `npm install && npm run dev` → http://localhost:3000
4. Logga in, öppna Inställningar och byt till önskat tema.

## Vercel
1. Environment Variables för Production, Preview, Development (alla 6–7 st).
2. Deploy. Efter deploy: **Deployments → ⋮ → Redeploy → bocka UR "Use existing Build Cache"**.
3. Öppna i inkognito första gången (gamla v4-cookies ogiltigförklaras automatiskt).

## Felsök
- `/api/health` är öppen och visar version, vilka miljövariabler som finns och databasstatus.
- Om `db: "FEL"` med `column goals.id does not exist` → kör om `supabase/schema.sql` i din Supabase SQL Editor.
- Efter att du bytt miljövariabler måste du redeploya.

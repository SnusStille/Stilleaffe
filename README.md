# Säljdashboard
Next.js 14 · två inloggningar via miljövariabler (Stille = säljare, Affe = chef) · Supabase-databas (bara via servern) · Claude via servern.

## Kom igång
1. Supabase: skapa projekt, kör `supabase/schema.sql` i SQL Editor.
2. Fyll i `.env.local`. **`NEXT_PUBLIC_SUPABASE_URL` ska bara vara `https://xxxx.supabase.co`** (Project Settings → API → Project URL). `SUPABASE_SERVICE_ROLE_KEY` = service_role-nyckeln (hemlig).
3. `npm install && npm run dev` → http://localhost:3000
4. Logga in som Stille, öppna AI-coach och klistra in Anthropic-nyckeln (eller sätt `ANTHROPIC_API_KEY`).

## Roller
- **Stille (seller):** registrerar, ändrar mål, kommenterar, ber AI:n föreslå ändringar.
- **Affe (manager):** läser allt, kommenterar, frågar AI:n. Kan inte ändra siffror.

## Vercel
Lägg in alla variabler från `.env.local` under Environment Variables (`.env.local` committas inte). Byt gärna lösenorden till längre.

## Notiser
In-app (klockan) + webbläsarnotiser när sidan är öppen. Riktig bakgrundspush/e-post kräver t.ex. Vercel Cron + e-posttjänst – inte byggt.

## Mobil
Appen kan läggas på hemskärmen (PWA): öppna sidan i mobilen → Dela/Meny → "Lägg till på hemskärmen".

## Felsökning
- Rött fel överst i appen = databasen svarar inte. Kolla `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` och att `supabase/schema.sql` är körd (inkl. kommentartabellen).
- Efter att du ändrat miljövariabler i Vercel måste du deploya om.

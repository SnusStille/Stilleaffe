# Stilleaffe v7 — installation och uppgradering

## Innan du börjar

V7 har byggts och typkontrollerats med `npx next build`. Inga nya miljövariabler tillkommer; `ANTHROPIC_MODEL=claude-sonnet-5-5` är kvar. Uppgraderingen lägger till v7-kolumner/tabeller men behåller befintliga säljregistreringar och dina sparade mål. SQL-filen kan köras flera gånger.

## 1. Kör SQL-migreringen

1. Öppna Supabase Dashboard för **samma projekt** som anges i Vercel.
2. Välj **SQL Editor → New query**.
3. Öppna `supabase/schema.sql` från v7-paketet, kopiera hela filen och klistra in i SQL Editor.
4. Kör queryn och kontrollera att den avslutas utan fel.

Den uppdaterar bland annat humör/rating/taggar, veckomål, aktivitetsflöde, kommentarer (reaktioner/pinning) och märken. Den behåller nuvarande mål vid omkörning.

## 2. Uppdatera Supabase-nyckeln

**Viktigt:** `Unregistered API key` betyder oftast att nyckeln är fel/avklippt eller kommer från ett annat Supabase-projekt än URL:en. URL och nyckel måste komma från samma projekt.

Rekommenderat nyckelflöde i Supabase nu:

1. Supabase Dashboard → rätt projekt → **Settings → API Keys**.
2. Under **Secret keys**, skapa/kopiera en servernyckel som börjar `sb_secret_`.
3. Kopiera hela värdet (inte `sb_publishable_...`). `sb_secret_...` är en riktig servernyckel när den har skapats i det projektet och ska hållas hemlig.
4. Den äldre **service_role**-nyckeln i JWT-format (`eyJ...`) stöds också. För den ska du kopiera hela `service_role`-värdet.
5. Kontrollera att **Project URL** matchar `NEXT_PUBLIC_SUPABASE_URL` i Vercel. Lägg aldrig secret/service_role-nyckeln i en `NEXT_PUBLIC_...`-variabel.

Officiell referens: https://supabase.com/docs/guides/getting-started/api-keys

## 3. Byt miljövariabler i Vercel — en i taget

Öppna Vercel → projektet → **Settings → Environment Variables**. Lägg till eller uppdatera varje variabel separat; välj rätt miljö (Production och gärna Preview). Kolla att stavningen i **Key** är exakt:

1. **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   **Value:** Project URL från samma Supabase-projekt, exempelvis `https://<project-ref>.supabase.co`.
2. **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   **Value:** hela nya `sb_secret_...`-nyckeln (rekommenderas), eller hela legacy `service_role`-JWT:n (`eyJ...`). Variabelnamnet är appens server-side inställning; hemligheten får inte exponeras till webbläsaren.
3. **Key:** `SELLER_PASSWORD`
   **Value:** ditt befintliga starka säljar-lösenord.
4. **Key:** `MANAGER_PASSWORD`
   **Value:** ditt befintliga starka chefslösenord.
5. **Key:** `SESSION_SECRET`
   **Value:** en slumpmässig hemlighet på minst 32 tecken. Behåll den befintliga om den inte har läckt; ändra den roterar alla inloggningssessioner.
6. **Key:** `ANTHROPIC_API_KEY`
   **Value:** din Anthropic API-nyckel. Valfri om AI inte ska användas.
7. **Key:** `ANTHROPIC_MODEL`
   **Value:** `claude-sonnet-5-5` — behåll exakt detta modellnamn.

Ta bort gammal `SUPABASE_SERVICE_ROLE_KEY`-rad först om Vercel annars skapar dubbletter. Spara ändringen för **Production**; upprepa även för Preview om du använder preview-deployments.

## 4. Ersätt kod och pusha

1. Ersätt filerna i GitHub-repot `SnusStille/Stilleaffe` med innehållet i v7-mappen. Behåll `.gitignore` så `.env.local` inte checkas in.
2. Kontrollera att `.env.local` **inte** finns i git (`git status`).
3. Pusha ändringarna. Vercel startar normalt en ny deployment automatiskt.

Exempel:

```bash
git add .
git commit -m "Stilleaffe v7 — MAXAD"
git push
```

## 5. Rensa byggcache och kontrollera

Om du väljer **Redeploy** manuellt: öppna Deployment → menyn med tre prickar → **Redeploy** och stäng av **Use existing Build Cache**.

Efter deploy:

1. Öppna `/api/health`. Kontrollera `v: "v7"` och att `db: "ok"`.
2. Logga in. V7 använder ny auth-version; logga in igen om den gamla sessionen inte längre fungerar.
3. Registrera en testdag och kontrollera aktivitet, märken, kommentarer och statistik. Ta sedan bort testdagen om du inte vill behålla den.

## 6. Rotera hemligheter som tidigare exponerats

När du har bekräftat att den nya deploymenten fungerar:

- Skapa en ny Supabase Secret key, uppdatera Vercel `SUPABASE_SERVICE_ROLE_KEY`, testa appen, och först därefter ta bort den gamla nyckeln.
- Rotera Anthropic-nyckeln i Anthropic Console och uppdatera `ANTHROPIC_API_KEY` i Vercel.
- Byt säljar- och chefslösenord om de har synts i GitHub eller chatt.
- Rensa/ta bort läckta nycklar från publika commits där möjligt. En roterad nyckel ska ändå betraktas som komprometterad.

## Vad v7 lägger till

- Tangentbordsstyrd kommandopalett (`⌘K` på Mac, `Ctrl+K` på Windows/Linux).
- Citat för dagen, 13 sparade achievements med milstolpsfirande och stora confetti.
- Separata reglage för chime-ljud och haptik (om enheten stöder vibration), pekarspotlight utan render per musrörelse.
- Live-status i sidtitel och favicon.
- Veckoringar, kalenderarbetsdagsbaserad prognos, periodjämförelse och statistik över humör/rating/taggar.
- Kommentarreaktioner, fastnåling, olästa-markering och aktivitetsflöde.
- Fem färgteman, mobilvänlig navigering och befintliga v6-funktioner.

## Lokalt

Kopiera `.env.example` till `.env.local`, fyll i värdena, kör `npm install`, kör SQL-schemat i Supabase och starta med `npm run dev`. Kör `npm run build` före deploy vid behov.

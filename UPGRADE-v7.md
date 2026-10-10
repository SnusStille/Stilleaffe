# Stilleaffe v7 — installation och uppgradering

## Innan du börjar

V7 använder `@supabase/supabase-js` 2.117.3 för att stödja Supabase `sb_secret_`-nycklar och kräver därför Node.js 22.x i Vercel. Inga nya miljövariabler krävs: `SUPABASE_SECRET_KEY` är ett valfritt alias som prioriteras om det är satt; annars används befintliga `SUPABASE_SERVICE_ROLE_KEY`. `ANTHROPIC_MODEL=claude-sonnet-5-5` är kvar. Uppgraderingen lägger till v7-kolumner/tabeller men behåller befintliga säljregistreringar och dina sparade mål. SQL-filen kan köras flera gånger.

## 1. Kör SQL-migreringen

1. Öppna Supabase Dashboard för **samma projekt** som anges i Vercel.
2. Välj **SQL Editor → New query**.
3. Öppna `supabase/schema.sql` från v7-paketet, kopiera hela filen och klistra in i SQL Editor.
4. Kör queryn och kontrollera att den avslutas utan fel.

Den uppdaterar bland annat humör/rating/taggar, veckomål, aktivitetsflöde, kommentarer (reaktioner/pinning) och märken. Den behåller nuvarande mål vid omkörning, lägger till `goals.id` om den saknas och hanterar äldre `goals.user_id`-kolumner genom att göra dem valfria för v7. Om en tidigare körning stannade på `column "id" of relation "goals" does not exist`, ersätt SQL-filen med denna v7-version och kör hela filen igen.

## 2. Välj rätt Supabase-servernyckel

**Viktigt:** En env-flagga som säger att nyckeln finns bekräftar inte att nyckeltypen är rätt. `anon`/`sb_publishable_` är inte adminnycklar. URL och nyckel måste komma från samma Supabase-projekt.

1. Supabase Dashboard → rätt projekt → **Settings → API Keys**.
2. Rekommenderat: under **Secret keys**, skapa/kopiera en servernyckel som börjar `sb_secret_`.
3. Alternativt stöds den äldre **service_role**-nyckeln i JWT-format (`eyJ...`), men dess JWT-roll måste vara `service_role` — inte `anon`.
4. I den här appversionen ska den nya nyckeln ligga i `SUPABASE_SECRET_KEY`; den äldre JWT kan ligga i `SUPABASE_SERVICE_ROLE_KEY`. Om båda är satta används `SUPABASE_SECRET_KEY`.
5. Kontrollera att **Project URL** matchar `NEXT_PUBLIC_SUPABASE_URL`. Lägg aldrig secret/service_role-nyckeln i en `NEXT_PUBLIC_...`-variabel och dela aldrig värdet i chatt eller supportärenden.

Officiell referens: https://supabase.com/docs/guides/getting-started/api-keys

## 3. Byt miljövariabler i Vercel — en i taget

Öppna Vercel → projektet → **Settings → Environment Variables**. Lägg till eller uppdatera varje variabel separat; välj rätt miljö (Production och gärna Preview). Kolla att stavningen i **Key** är exakt:

1. **Key:** `NEXT_PUBLIC_SUPABASE_URL`  
   **Value:** Project URL från samma Supabase-projekt, exempelvis `https://<project-ref>.supabase.co`.
2. **Rekommenderat Key:** `SUPABASE_SECRET_KEY`  
   **Value:** hela `sb_secret_...`-nyckeln från samma Supabase-projekt. Alternativt kan du behålla `SUPABASE_SERVICE_ROLE_KEY` med hela legacy `service_role`-JWT:n (`eyJ...`). Om båda finns används `SUPABASE_SECRET_KEY`. Använd aldrig `anon`/`sb_publishable_...`; nyckeln är endast server-side.
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

Använd helst endast en av nyckelvariablerna, så det inte blir oklart vilken som är aktiv. Om båda är satta prioriterar koden `SUPABASE_SECRET_KEY`. Kontrollera även Vercel → **Settings → General → Node.js Version** och välj **22.x**. Spara ändringen för **Production**; upprepa även för Preview om du använder preview-deployments.

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

1. Öppna `/api/health`. Svaret är nu dynamiskt och `no-store` (inte en build-time snapshot). Kontrollera `adminKey.source`/`adminKey.type`, `db: "ok"` samt `dbProbes.sales_entries: "ok"`. Svaret klassificerar endast nyckeltypen/rollen och innehåller aldrig själva nyckeln. Proben är read-only och bekräftar SELECT — den utför inga INSERT/UPDATE/DELETE-tester.
2. Om `sales_entries` visar fel, spara endast feltexten och `adminKey.type` — dela aldrig någon nyckel. Kontrollera sedan att Vercel Production har rätt nyckel för samma projekt och gör en ny deployment.
3. Logga in. V7 använder ny auth-version; logga in igen om den gamla sessionen inte längre fungerar.
4. Registrera en testdag och kontrollera aktivitet, märken, kommentarer och statistik. Ta sedan bort testdagen om du inte vill behålla den.

## 6. Rotera hemligheter som tidigare exponerats

När du har bekräftat att den nya deploymenten fungerar:

- Skapa en ny Supabase Secret key, uppdatera Vercel `SUPABASE_SECRET_KEY` (eller den enda nyckelvariabel du valt), testa appen, och först därefter ta bort den gamla nyckeln.
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

Använd Node.js 22.x. Kopiera `.env.example` till `.env.local`, fyll i värdena, kör `npm install`, kör SQL-schemat i Supabase och starta med `npm run dev`. Kör `npm run build` före deploy vid behov.

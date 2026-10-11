# Inloggning — v19 redesign

Utgångspunkt: den befintliga privata StilleAffe-inloggningen och dess seller/manager-auth. Inloggnings-API, cookie och lösenordshantering har inte bytts ut. Den nya hero-bilden är originalgenererad Wall-Street-inspirerad miljökonst — inte en filmruta eller en skådespelarlikhet — och är optimerad till en lokal WebP på cirka 82 kB.

## Tio konkreta förbättringar

1. **Editorial split-screen:** en tydlig berättande bildyta och en separat, lugn inloggningsyta i stället för ett ensamt standardkort.
2. **Wall Street-atmosfär:** lokal, mörk Manhattan-/kontorsbild med anonym silhuett, gradierad så texten förblir läsbar.
3. **StilleAffe-identitet:** upphöjd S/A-monogram, egen typografi, grafitbas och växlande diskret teal/guld-accent.
4. **Rollkort:** Stille/Säljare och Affe/Chef visas med olika förklaringar, valstatus och tangentbordsfokus; auth-rollen skickas fortfarande till samma endpoint.
5. **Dagens fokus:** en kort svensk coachningsrad med manuell nästa-knapp och datumval i Stockholmstid; inga säljresultat eller andra påhittade data.
6. **Lösenordsfält med tydlighet:** synlig låsikon, större klickyta för visa/dölj, `current-password`, `aria-invalid` och kopplad hjälpläsning.
7. **Fokus och kontrast:** tydliga `:focus-visible`-ringar och aktivt fältläge; fokusera lösenordsfältet på desktop men öppna inte mobilens tangentbord automatiskt.
8. **Ärlig feedback:** separat fel-/statusruta, fel lösenord fokuseras igen, uppladdning har text och spinner, lyckad inloggning får en kort bekräftelse innan befintlig omdirigering.
9. **Avsiktlig rörelse:** långsam kameradrift och ett mjukt ljusstråk i hero-bilden, korta övergångar i formuläret, ingen blinkning; `prefers-reduced-motion` stänger av animationerna.
10. **Mobilanpassning:** hero och formulär staplas, bilden beskärs om utan externa resurser och valen/knapparna behåller touchvänliga mål.

## Verifierat

- `tsc --noEmit` och `npm run build` passerade efter redesignen.
- `/login` returnerar 200 och den optimerade hero-bilden returnerar 200 (`image/jpeg` via Next Image-optimering).
- Autentisering mot riktiga credentials/Supabase är inte verifierad i denna arbetsmiljö utan hemligheter.

## Mål och dashboardrörelse — v20

- Säljaren och Affe får nu en gemensam, tydlig målkortsyta högst upp på Översikt. Affe ser Stilles dagsmål stort, dagens faktiska registrering (eller tydligt “Ej registrerat”), samt TB-, vecko- och månadsmål i samma kort. Kortet är skrivskyddat för Affe.
- Säljaren kan öppna Mål direkt från målkortet. Målredigeringen är grupperad i **Dagsmål**, **Veckomål** och **Månadsmål**, med förklarande etiketter, enheter och separat sparaåtgärd.
- Båda rollernas vyer får en kort, fördröjd entré och diskret 3D-/hoverdjup; målkortets volymstapel och befintliga 3D-veckodiagram står för djupet. `prefers-reduced-motion` stänger av rörelsen.

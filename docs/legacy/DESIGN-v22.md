# StilleAffe v22 — studio dashboard & notiscenter

Fortsättning på det befintliga repot. V22 lägger till ett valbart visuellt läge och gör notiserna enklare att hitta; inga nya databasfält, roller eller API-behörigheter krävs.

## Vad som ändrats

- **Notiser flyttade från sidans övre högra hörn till navigeringen.** På desktop ligger knappen i sidomenyn; på mobil finns den som en egen ikon i den rullbara bottennavigeringen.
- **Ett riktigt notiscenter:** visar aktiva lägesnotiser från befintliga data, olästa kommentarer och webbläsarens tillstånd för skrivbordsnotiser. `Visa` öppnar Kommentarer och följer den befintliga läsmarkeringen; inget meddelande skickas automatiskt.
- **Bättre placering av panelen:** popupen förankras till notisknappen på desktop och visas ovanför mobilens bottenmeny. Den kan stängas med Escape eller utanförklick.
- **Studio / Lugn:** användaren kan välja mer 3D/övergångar eller ett lugnare, statiskt djup. Valet sparas lokalt i webbläsaren, inte i Supabase.
- **Interaktivt 3D-veckodiagram:** scenen lutar försiktigt efter muspekaren utan React-state-uppdatering per rörelse. Den funktionen är avstängd i lugnt läge och vid systemets `prefers-reduced-motion`.
- **Sammanhängande login-känsla:** rollkorten och inloggningsknappen får samma fasetterade, lätt upphöjda 3D-detaljer som dashboarden; auth-flödet är oförändrat.
- **Renare desktop-huvudrad:** den fasta Logga ut-knappen döljs på större skärmar där samma åtgärd redan finns i profilpanelen. Mobilens genväg är kvar.
- **Rörelse- och fokusregler:** reducerad rörelse i operativsystemet går alltid före Studio-läget.

## Säkerhet och integritet

- Notiserna härleds från befintliga, autentiserade data och olästa kommentarer; inga falska säljresultat skapas.
- Säljare och chef behåller sina befintliga behörigheter. Skrivbordstillstånd begärs först när användaren själv trycker på Aktivera.
- Rörelseläget sparas endast som en lokal visuell preferens. Ingen schemaändring eller SQL-migrering behövs.

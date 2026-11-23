# StilleAffe v23 — tydlig rörelse på inloggningen

Fortsättning på det befintliga repot. V23 gör loginens rörelse lättare att se, efter att den tidigare långsamma bilddriften upplevdes som för diskret. Inloggningsflödet, lösenordshanteringen och rollerna är fortsatt oförändrade.

## Vad som ändrats

- Loginens stilla kontorsbild byts mot en originalgenererad illustration av ett anonymt Manhattan-handelsgolv. Bilden är inte en riktig filmruta eller ett identifierbart foto av en skådespelare.
- Hero-bilden får en tydligt märkbar, långsam kameradrift med zoom och sidoförflyttning. Rörelsen använder CSS-transform och upprepas mjukt.
- Ett mjukt ljus sveper över bilden och en smal glimt passerar separat; de är dekorativa och visar ingen marknads- eller användardata.
- En dekorativ ticker rör sig i loginens sidfot. Den innehåller bara statiska varumärkes-/fokusord, inte påhittade KPI:er.
- `prefers-reduced-motion: reduce` stänger av login-animationerna. Mobilens beskärning och tickerbredd anpassas separat.
- Middleware tillåter exakt `/wallstreet-floor-original.jpg` offentligt så att loginbilden visas före autentisering.

## Säkerhet och prestanda

- Ingen ändring av autentisering, sessioner, API-behörigheter eller databas.
- Bildens rörelse och glimt animerar främst `transform`/`opacity`; inga videor, nätverksströmmar eller marknadsfeed har lagts till.
- Tickertexten är dold från skärmläsare eftersom den är dekorativ. Reduced-motion-inställningen tar bort dess rörelse.

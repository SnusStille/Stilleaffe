# StilleAffe v25 — handelsgolv-energi

**Varför sidan stod still:** `design-v11.css` (Deep Carbon) stänger av animationer på kort, ringar, logga, menyknappar och tickern med `animation:none!important`. v25 slår på rörelsen igen, medvetet och med syfte.

- Handelsgolv-bakgrund: pulserande ljusstakar, en kurslinje som ritas, guldstoft och ett ljus som sveper. Dekorativt, ingen påhittad data.
- Börsbandet rör sig på riktigt (sömlös loop, pausar vid hover). Innehåll = dina riktiga siffror.
- Kort stiger in vid flikbyte, ring/loggor/mynt/staplar lever i vila, guldkant snurrar på nyckelkort.
- Login: "MARKET OPEN · RING THE BELL", guldskimrande rubrik, ljusstakar över Wall Street-bilden, guldkant på inloggningskortet, ticker med handelsgolvsord.
- `prefers-reduced-motion` och "quiet"-läget stänger av all ambient rörelse.

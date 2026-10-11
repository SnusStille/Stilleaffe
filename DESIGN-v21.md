# Designuppgradering v21 — tio visuella detaljer

Fortsättning på den befintliga StilleAffe-appen. Den här uppgraderingen lägger ett diskret lager djup ovanpå befintliga komponenter; den byter inte ut appen, ändrar inte data eller mål och rör inte autentisering eller rollbehörigheter.

1. **Studio-bakgrund:** lågmält teal-/indigoljus och ett svagt rutnät ger dashboarden mer rymd utan att konkurrera med siffrorna.
2. **Upphöjd navigationsrail:** sidomenyn får en grafitgradient, fin kantbelysning och tydligare separation från innehållet.
3. **S/A-monogram i 3D:** logomärket får fasetterade skuggor och en liten respons vid hover.
4. **Taktile navknappar:** aktiv sektion får en upphöjd yta och en tunn rollfärgad markör; hover ger ett litet perspektivskift.
5. **Kommandodäck:** uppdateringstid, färskhetsknapp och notisknapp får ett sammanhållet, lätt upphöjt kontrollutseende.
6. **Målkort med omloppslinjer:** dagsmålet — även synligt för Affe — får diskreta elliptiska 3D-banor och en fin glasad kant.
7. **KPI-kort med lyft:** sälj-/TB-kort och rapportpaneler får tydligare övre ljuskant, djupare skugga och en mjuk lutning vid hover.
8. **Upphöjd dagsring:** progressringen får en lågmäld plint/glöd så den läses som en separat fysisk del av dagens hero-kort.
9. **Djupare sjudagarsdiagram:** det befintliga 3D-diagrammets golv blir tydligare och scenen svarar med en liten rörelse vid hover. Endast registrerade resultat används.
10. **Coachningsytor:** coachkort, chefsrapport, fokus-citat och snabböversikt får gemensam lagerkänsla och samma teal-/guldtoning som rollen.

**Tillgänglighet och prestanda:** rörelsen är kort och huvudsakligen hoverstyrd. Pekskärmar får ingen hoverberoende funktion, tangentbordsfokus är oförändrat och `prefers-reduced-motion` stänger av de nya animationerna och övergångarna. Allt är CSS-baserat; ingen ny tredjepartsresurs eller JavaScript-renderingsloop har lagts till.

import type { GuideCategory, GuideSection, GuideService, GuideSource } from './types';

/**
 * LABEL LAB — SPELGUIDE
 *
 * Innehållet är strukturerat efter originalunderlaget och de officiella
 * produktsidorna. Källmärkningen är tydlig:
 *   official = kan verifieras på vipo.se
 *   internal = internt säljargument, inte en produktlöftet
 *   verify   = måste bekräftas av ledning innan det används som fakta
 *
 * Inga produktlöften har lagts till. Priser är kampanjberoende och ska alltid
 * bekräftas innan de används i ett samtal.
 */

const OFFICIAL_BK =
  'Källa: https://www.vipo.se/brandkollen/ (hämtad 2026-11-23). Brandkollen är en uppkopplad rök- och kolmonoxiddetektor som larmar med ljud, SMS och samtal från larmcentralen. Om du inte svarar kontaktas anhöriga enligt din larmplan. Tjänsten testar sig själv varje timme och mäter temperatur dagligen. Den använder mobilnätet – ingen app och inget WiFi.';
const OFFICIAL_KK =
  'Källa: https://www.vipo.se/konsumentkollen/ (hämtad 2026-11-23). Konsumentkollen handlar om personnummerbevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Exakt innehåll och pris ska alltid bekräftas mot aktuellt avtal.';
const VERIFY_PRICE =
  'Kampanjpriser och paketändringar ska bekräftas med ledning innan de lovas i ett samtal. Ange alltid källa och datum för senaste godkännande.';

export const GUIDE_SECTIONS: GuideSection[] = [
  /* ==================================================================
   * BRANDKOLLEN
   * ================================================================ */
  {
    id: 'bk-manus',
    service: 'brandkollen',
    category: 'manus',
    title: 'Brandkollen — komplett manus',
    summary: 'Hela samtalet från uppringning till avslut. Använd som ryggrad, läs inte ordagrant.',
    body: `[UPPRINGNING]
"Hej, [NAMN]! Det är [DITT NAMN] från Label Lab. Jag ringer kort om brand- och kolmonoxidsäkerheten i [ORT]. Har du en minut?"

[HOOK — DET FARLIGASTE ÄR DET DU INTE MÄRKER]
"De flesta har en brandvarnare på väggen. Den hörs – men den ringer inte upp dig om du inte är hemma. Kolmonoxid är dessutom osynlig och luktfri, och kan göra dig medvetslös innan en vanlig brandvarnare hinner reagera."

[BEHOV — STÄLL ÖPPNA FRÅGOR]
"Vilket skydd har du hemma idag?"
"Har du funderat på vad som händer om det börjar bränna medan du är på jobb eller på resa?"
"Är det någon i hushållet som är extra känslig – barn, äldre eller husdjur?"

[PRESENTATION]
"Brandkollen är en uppkopplad rök- och kolmonoxiddetektor. Den upptäcker rök och kolmonoxid tidigt och larmar med ljud, SMS och samtal från larmcentralen. Om du inte svarar ringer larmcentralen dina anhöriga enligt din personliga larmplan. Den testar sig själv varje timme och mäter temperaturen dagligen. Den kopplas upp via mobilnätet – du behöver ingen app och inget WiFi."

[FÖRDELAR — KOPPLA TILL KUNDENS BEHOV]
"Det som skiljer den från en vanlig brandvarnare är att larmet når dig även när du inte är hemma, och att en människa i larmcentralen följer upp. Självtestet varje timme gör att du slipper undra om den fungerar."

[INVÄNDNINGAR — LYSSNA, BEKRÄFTA, SVARA, GÅ VIDARE]
"Det är rimligt att vilja jämföra. Vad är viktigast för dig – att larmet når dig när du inte är hemma, eller att någon faktiskt följer upp?"

[AVSLUT]
"Ska vi säkerställa att du får larm direkt i mobilen och en uppföljning från larmcentralen? Jag behöver bara [UPPGIFTER] för att komma igång."

[BEKRÄFTA]
"Vad bra. Jag sammanfattar: [PAKET], [PRIS], [BINDNINGSTID]. Du får en bekräftelse på [E-POST]. Har du någon fråga innan vi avslutar?"`,
    bullets: [
      'Lyssna klart innan du svarar.',
      'Bekräfta känslan innan du kommer med fakta.',
      'Koppla varje fördel till något kunden just sa.',
      'Avtala alltid en tydlig nästa åtgärd.',
    ],
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 10,
  },
  {
    id: 'bk-oppning',
    service: 'brandkollen',
    category: 'oppning',
    title: 'Öppning — de första 20 sekunderna',
    summary: 'Syftet med öppningen är att få tillåtelse att fortsätta, inte att sälja.',
    body: `**Mål:** få en ja-fråga och ett namn. inte presentera hela tjänsten.

**Varianter**
1. "Hej [NAMN], det är [DITT NAMN] från Label Lab. Jag ringer kort om brand- och kolmonoxidsäkerheten i [ORT]. Har du en minut?"
2. "Hej [NAMN]! Vi hjälper just nu hushåll i [ORT] att få ett brandlarm som når mobilen även när man inte är hemma. Får jag visa hur det fungerar på två minuter?"
3. "Hej [NAMN], jag ringer inte för att sälja något färdigt paket – jag vill först höra vilket skydd du har idag. Vad har du hemma?"

**Gör**
- Säg ditt namn och företaget tydligt.
- Fråga om tid.
- Använd kundens namn en gång, inte tio.
- Var nyfiken på deras situation.

**Undvik**
- Att läsa en lång produktmonolog.
- Att påstå att "alla" behöver tjänsten.
- Att pressa fram ett ja innan du vet något om kunden.`,
    source: 'internal',
    order: 20,
  },
  {
    id: 'bk-behov',
    service: 'brandkollen',
    category: 'behov',
    title: 'Behovsanalys — frågor som öppnar samtalet',
    summary: 'Fråga om vardagen, inte om produkten. Behovet finns redan i kundens situation.',
    body: `**Bostad och vardag**
- "Bor du i villa, lägenhet eller radhus?"
- "Är ni ofta hemma på dagtid, eller är bostaden tom när ni jobbar?"
- "Har du barn, äldre föräldrar eller husdjur som är hemma mycket?"

**Nuvarande skydd**
- "Vilket brandlarm har du idag?"
- "När monterades det senaste – vet du om det fungerar?"
- "Har du ett kolmonoxidlarm?"
- "Vad händer om larmet går medan du är bortrest?"

**Konsekvens och trygghet**
- "Vad skulle värsta scenariot vara för er?"
- "Hur skulle du vilja bli uppmärksammad – med ljud, SMS eller ett samtal?"
- "Finns det någon anhörig du vill att vi kontaktar om du inte svarar?"

**Prioritering**
- "Vad är viktigast för dig: tidig varning, uppföljning av en människa, eller att slippa oroa dig för att utrustningen fungerar?"

Skriv ner svaren. Återanvänd dem i presentationen och i avslutet.`,
    source: 'internal',
    order: 30,
  },
  {
    id: 'bk-presentation',
    service: 'brandkollen',
    category: 'presentation',
    title: 'Presentation — tjänsten på 60 sekunder',
    summary: 'Beskriv vad den gör, hur den gör det och vad kunden märker – i den ordningen.',
    body: `**Vad den gör**
"Brandkollen är en uppkopplad rök- och kolmonoxiddetektor. Den upptäcker rök och kolmonoxid och larmar tidigt – med ljud, SMS och samtal."

**Hur den gör det**
"Den är kopplad via mobilnätet, så du behöver ingen app och inget WiFi. Larmet går till larmcentralen. Om du inte svarar ringer de dina anhöriga enligt din larmplan."

**Vad kunden märker**
"Du får ett SMS och ett samtal. Du slipper installera något. Och du behöver inte oroa dig för att den ska tappa funktionen – den testar sig själv varje timme."

**Vad den inte är**
"Det här är inte ett helt hemlarm med kameror och rörelsedetektorer. Det är ett fristående, uppkopplat brand- och kolmonoxidlarm. Det kan komplettera ett befintligt larm."

**Fråga tillbaka**
"Skulle det passa er situation – att larmet når mobilen även när ni inte är hemma?"`,
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 40,
  },
  {
    id: 'bk-fordelar',
    service: 'brandkollen',
    category: 'fordelar',
    title: 'Produktfördelar — koppla till kundens behov',
    summary: 'Säg inte en lista. Välj de två fördelar som matchar det kunden just berättade.',
    body: `**1. Tidig varning vid rök och kolmonoxid**
"En vanlig brandvarnare reagerar på rök. Kolmonoxid är osynlig och luktfri – Brandkollen upptäcker också den."

**2. Larmet når dig även när du inte är hemma**
"Du får ljud, SMS och samtal. Det spelar ingen roll om du är på jobb, på resa eller handlar."

**3. En människa följer upp**
"Om du inte svarar kontaktar larmcentralen dina anhöriga enligt din larmplan. Du är inte ensam med larmet."

**4. Självtest varje timme**
"Du slipper undra om detektorn fungerar. Den testar sig själv varje timme och mäter temperaturen dagligen."

**5. Enkel installation**
"Ingen app, inget WiFi. Den kopplas upp via mobilnätet."

**Regel:** Varje fördel ska följas av "…och det betyder för dig att …". Annars är det bara en feature.`,
    bullets: [
      'Tidig varning vid både rök och kolmonoxid.',
      'Ljud, SMS och samtal från larmcentral.',
      'Vidarebefordran till anhöriga enligt larmplan.',
      'Självtest varje timme, temperaturmätning dagligen.',
      'Mobilnät – ingen app, inget WiFi.',
    ],
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 50,
  },
  {
    id: 'bk-avslut',
    service: 'brandkollen',
    category: 'avslut',
    title: 'Avslut — fråga efter beslut',
    summary: 'Ett avslut är en fråga, inte ett tryck. Gör nästa steg litet och tydligt.',
    body: `**Direkt avslut**
"Ska vi säkerställa att du får larmet direkt i mobilen? Jag behöver bara ditt namn, adress och e-post."

**Val avslut**
"Vill du börja med en detektor till [RUM], eller ska vi säkra hela bostaden på en gång?"

**Sammanfattande avslut**
"Vad bra. Jag sammanfattar: [PAKET] till [PRIS], [BINDNINGSTID]. Du får bekräftelsen på [E-POST]. Ska jag skicka den nu?"

**Om kunden säger nej**
"Tack för att du tog dig tid. Ska jag skicka en kort sammanfattning så att du kan titta på det i lugn och ro?"

**Gör**
- Fråga om beslut när behovet är bekräftat.
- Upprepa det kunden sa att hen ville ha.
- Håll tyst efter frågan.

**Undvik**
- Att rabbla fler fördelar efter att kunden sagt nej.
- Att lova något du inte kan bekräfta.`,
    source: 'internal',
    order: 60,
  },
  {
    id: 'bk-hemlarm',
    service: 'brandkollen',
    category: 'hemlarm',
    title: 'Hemlarm — hur Brandkollen skiljer sig',
    summary: 'Brandkollen är inte ett helt hemlarm. Förklara skillnaden utan att prata ner konkurrenter.',
    body: `**Vad ett hemlarm ofta är**
Ett hemlarm är ofta ett helt system med centralenhet, rörelsedetektorer, kameror och ibland dörrkontakter. Det kan kräva app, WiFi och ibland installation.

**Vad Brandkollen är**
"Brandkollen är ett fristående, uppkopplat brand- och kolmonoxidlarm. Det handlar om att upptäcka rök och kolmonoxid och att larmet når dig – via ljud, SMS och samtal från larmcentralen. Det är inte ett helt hemlarm med kameror."

**När det passar**
"Om du redan har ett hemlarm kan Brandkollen ändå fylla en funktion: det är ett dedikerat brand- och kolmonoxidlarm som inte beror av hemmets nätverk."

**När det inte passar**
"Om du vill ha kameror, rörelsedetektorer och en heltäckande inbrottslarm – då är det här inte rätt produkt."

**Viktig avgränsning**
Säg inte att Brandkollen ersätter ett hemlarm eller att den skyddar mot inbrott. Det gör den inte.`,
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 70,
  },
  {
    id: 'bk-konkurrens',
    service: 'brandkollen',
    category: 'konkurrens',
    title: 'Konkurrenshantering — Verisure, Sector Alarm och hemlarm',
    summary: 'Prata aldrig ner en konkurrent. Flytta samtalet från märke till behov.',
    body: `**Grundregel**
"Jämför aldrig påståenden om konkurrenter som du inte kan verifiera. Säg i stället: 'Jag ska inte säga något om deras lösning. Jag kan berätta vad den här tjänsten gör.'"

**Om kunden har Verisure**
"Det är bra att ni redan har ett larm. Vad jag frågar om är brandskyddet: har ni ett uppkopplat brand- och kolmonoxidlarm som ringer upp dig även när ni inte är hemma? Brandkollen kan komplettera ert befintliga system."

**Om kunden har Sector Alarm**
"Samma sak – om ni redan har ett larm kan den här tjänsten vara ett komplement för just brand och kolmonoxid. Det viktiga är att larmet når er och att någon följer upp."

**Om kunden har ett vanligt hemlarm**
"Ett hemlarm och ett brandlarm löser olika saker. Det här är dedikerat för rök och kolmonoxid, och det är uppkopplat via mobilnätet."

**Om kunden frågar ' Är ni bäst?'**
"Jag vill inte påstå att vi är bäst på allt. Det jag kan visa är vad den här tjänsten gör: tidig varning, larm till mobilen och uppföljning från larmcentral."

**Undvik**
- "De larmar inte lika bra."
- "De har dålig service."
- "Vi är billigast."
- Alla påståenden om konkurrenters priser, funktioner eller kundnöjdhet som du inte kan verifiera.

**Källa för produkten**
${OFFICIAL_BK}`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelser är inte verifierade. Använd bara vad som står om Brandkollen på vipo.se. Bekräfta eventuella jämförelser med ledning.',
    order: 80,
  },
  {
    id: 'bk-loop',
    service: 'brandkollen',
    category: 'loop',
    title: 'Brandkollen — loop och avslut',
    summary: 'Fem steg för att hantera tvekan och återkoppla till kundens behov.',
    body: `**1. Hantera tveksamhet**
"Det är helt okej att vara osäker. Vad är det som känns oklart – är det priset, installationen eller hur larmet fungerar?"

**2. Återkoppla till kundens behov**
"Du sa att ni ofta är bortresta. Då är det avgörande att larmet når mobilen – och att någon följer upp om du inte svarar."

**3. Produktens trygghetsvärde**
"Det handlar inte om en pryl. Det handlar om att du ska få veta tidigare och att någon faktiskt kontaktar dig."

**4. Prisargument**
"Vad kostar det att inte veta? Jag vill inte måla fasor, men jämför priset med vad en brand eller en kolmonoxidincident kan kosta. Ska jag gå igenom vad som ingår?"

**5. Avslut**
"Ska vi ta det vidare? Jag behöver bara [UPPGIFTER] för att komma igång."

**Loopa tillbaka**
Om kunden återkommer till samma invändning två gånger: byt argument. Gå från trygghet till service, från service till pris, från pris till behov. Upprepa inte samma mening.`,
    source: 'internal',
    order: 90,
  },
  {
    id: 'bk-faq',
    service: 'brandkollen',
    category: 'faq',
    title: 'Brandkollen — vanliga frågor',
    summary: 'Korta, ärliga svar på det kunder frågar oftast.',
    body: `**Behöver jag en app?**
"Nej. Brandkollen är uppkopplad via mobilnätet. Du behöver ingen app och inget WiFi."

**Vad händer om jag inte svarar?**
"Larmcentralen kontaktar dig med SMS och samtal. Om du inte svarar ringer de dina anhöriga enligt din larmplan."

**Hur ofta testar den sig själv?**
"Varje timme. Den mäter också temperaturen dagligen."

**Fungerar den vid strömavbrott?**
"Kontrollera produktens exakta strömförsörjning och reservkraft med ledning innan du lovar något."

**Kan jag ha den i hyresrätt?**
"Ja, den är fristående och kräver ingen app. Kontrollera alltid med hyresvärden om du är osäker."

**Ersätter den ett hemlarm?**
"Nej. Det är ett uppkopplat brand- och kolmonoxidlarm, inte ett helt hemlarm med kameror."

**Vad ingår i priset?**
"Det beror på aktuellt paket. Jag kan gå igenom vad som ingår och vad bindningstiden är – jag vill inte lova något jag inte kan bekräfta."

**Larmar ni polis eller brandkår?**
"Nej, det kan jag inte lova. Enheten larmar dig med ljud, SMS och samtal från larmcentralen. Om du inte svarar kontaktas personerna i din kontaktlista i den ordning du valt. Larmcentralen hjälper till att larma SOS Alarm när en rökutveckling kan konstateras. ViPo ansvarar inte för att polis, brandkår eller annan myndighet rycker ut."

**Vilka nummer får jag ange i kontaktlistan?**
"Privata kontaktpersoner du vill ska ringas vid larm. Nummer till polis, brandkår, väktarbolag eller andra myndigheter får inte anges."

**Kräver den mobiltäckning?**
"Ja. Enheten behöver täckning för Telias 4G-nät. Täckningen varierar med plats och kan ändras över tid, och ViPo garanterar inte nätåtkomst vid ett utlöst larm. Saknar bostaden täckning kan du häva avtalet."

**Vem äger enheten och vad händer när avtalet slutar?**
"Enheten är ViPos egendom och ska skickas tillbaka när avtalet upphör. ViPo debiterar 995 kronor per enhet som inte skickas tillbaka."

**Batterier?**
"ViPo skickar nya batterier kostnadsfritt när batteriernas livslängd närmar sig slutet. Du byter själv."

**Hur snabbt levereras den?**
"Normalt inom tre till fem arbetsdagar när avtalet ingås på distans."

**Vad gäller om ett larm uteblir?**
"ViPo svarar för skada orsakad av vårdslös hantering från ViPos sida, begränsat till ditt självriskbelopp hos försäkringsbolaget, högst 3 000 kronor. Hänvisa till avtalet för detaljer."`,
    source: 'official',
    sourceNote: OFFICIAL_BK + ' Larmkedja, kontaktlista, 4G-krav, enhetsägande, batterier, leverans och ansvarsbegränsning enligt huvudavtal Brandkollen (gäller fr o m 2023-06-01): https://www.vipo.se/wp-content/uploads/huvudavtal_brandkollen_20230601.pdf',
    order: 100,
  },

  /* ---------------- Brandkollen: invändningar ---------------- */
  {
    id: 'bk-inv-hemlarm',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag har redan hemlarm"',
    summary: 'Bekräfta och skilj på inbrottsskydd och brandskydd.',
    body: `**Vad kunden ofta menar**
"Jag tror att mitt befintliga larm redan täcker det här."

**Svar**
"Det är bra att du redan har ett larm. Det jag frågar om är brandskyddet: ett hemlarm och ett uppkopplat brandlarm löser olika saker. Brandkollen är ett fristående rök- och kolmonoxidlarm som ringer dig även när du inte är hemma. Det kan komplettera det du redan har."

**Följfråga**
"Vet du om ditt befintliga larm upptäcker kolmonoxid och ringer dig om du inte är hemma?"

**Undvik**
Att påstå att kundens hemlarm är dåligt eller att det inte fungerar.`,
    source: 'internal',
    order: 110,
  },
  {
    id: 'bk-inv-verisure',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag har Verisure"',
    summary: 'Respektera valet, flytta till brand- och kolmonoxidfrågan.',
    body: `**Svar**
"Det är bra att ni har ett larm. Jag ska inte säga något om Verisure – jag kan berätta vad Brandkollen gör. Det är ett dedikerat brand- och kolmonoxidlarm som larmar med ljud, SMS och samtal, och som testar sig själv varje timme. Om ni redan har ett system kan det här vara ett komplement för just brand och kolmonoxid."

**Följfråga**
"Har ni ett uppkopplat kolmonoxidlarm idag?"

**Undvik**
Alla påståenden om Verisures funktioner, priser eller service som du inte kan verifiera.`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelse ej verifierad. Bekräfta med ledning innan du säger något om Verisure.',
    order: 111,
  },
  {
    id: 'bk-inv-sector',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag har Sector Alarm"',
    summary: 'Samma princip: prata inte ner, fråga om kolmonoxid och uppföljning.',
    body: `**Svar**
"Det är bra att ni redan har ett larm. Jag kommenterar inte Sector Alarm. Det jag kan visa är vad Brandkollen gör: den upptäcker rök och kolmonoxid, larmar till mobilen och får en uppföljning från larmcentralen om ni inte svarar."

**Följfråga**
"Är det viktigast för er att få larmet tidigt, eller att någon faktiskt följer upp?"

**Undvik**
Att jämföra priser eller påstå att Sector Alarm saknar något.`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelse ej verifierad. Bekräfta med ledning.',
    order: 112,
  },
  {
    id: 'bk-inv-brandvarnare',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag har en vanlig brandvarnare"',
    summary: 'Den vanliga brandvarnaren är bra – men den ringer inte upp.',
    body: `**Svar**
"Det är bra att du har en brandvarnare. Den gör ett viktigt jobb. Skillnaden är att en vanlig brandvarnare bara hörs i rummet – den ringer inte dig om du inte är hemma, och den upptäcker inte kolmonoxid. Brandkollen larmar med ljud, SMS och samtal, och larmcentralen följer upp."

**Följfråga**
"Om det börjar brinna när du är på jobb – hur skulle du få veta det idag?"

**Undvik**
Att säga att en vanlig brandvarnare är värdelös.`,
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 113,
  },
  {
    id: 'bk-inv-aldrig-hemma',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag är aldrig hemma"',
    summary: 'Det är precis därför larmet ska nå mobilen.',
    body: `**Svar**
"Det är precis det den här tjänsten är till för. Eftersom den är uppkopplad får du larmet oavsett var du är – med SMS och samtal. Om du inte svarar kontaktar larmcentralen dina anhöriga enligt din larmplan."

**Följfråga**
"Vem vill du att vi kontaktar om du inte svarar?"

**Undvik**
Att måla upp skräckscenario. Håll det konkret.`,
    source: 'official',
    sourceNote: OFFICIAL_BK,
    order: 114,
  },
  {
    id: 'bk-inv-hyresratt',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag bor i hyresrätt"',
    summary: 'Fristående och appfri – men kontrollera hyresvärdens regler.',
    body: `**Svar**
"Brandkollen är fristående och kräver ingen app eller WiFi. Den passar ofta även i hyresrätt. Kontrollera gärna med din hyresvärd om du är osäker på vad som gäller för installation."

**Följfråga**
"Vill du att jag berättar hur installationen går till, så att du kan fråga din hyresvärd?"

**Undvik**
Att lova att hyresvärden alltid godkänner installationen.`,
    source: 'verify',
    sourceNote: 'Hyresvärdens regler varierar. Bekräfta installationskrav med ledning.',
    order: 115,
  },
  {
    id: 'bk-inv-dyrt',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Det är för dyrt"',
    summary: 'Bryt ner priset och koppla till värde – utan att hitta på siffror.',
    body: `**Svar**
"Jag förstår att priset spelar roll. Vad ingår i det du jämför med? Här får du en uppkopplad detektor, larm till mobilen och uppföljning från larmcentral. Ska jag gå igenom exakt vad som ingår och vad det kostar per månad?"

**Pris i perspektiv**
"Vad kostar det att inte få veta i tid? Jag vill inte skrämma dig, men det är värt att jämföra med vad en brand kan kosta."

**Följfråga**
"Är det prisbildningen eller själva tjänsten du är tveksam till?"

**Undvik**
- Att hitta på rabatter eller kampanjer du inte kan bekräfta.
- Att lova att priset gäller "för alltid".
- Att pressa fram ett beslut med rädsla.`,
    source: 'verify',
    sourceNote: VERIFY_PRICE,
    order: 116,
  },
  {
    id: 'bk-inv-partner',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag behöver prata med min partner"',
    summary: 'Boka en tid och ge ett konkret underlag – avfärda inte tanken.',
    body: `**Svar**
"Det är klokt att ni pratar om det tillsammans. När passar det att jag ringer igen? Jag kan skicka en kort sammanfattning så att ni har samma underlag."

**Följfråga**
"Vad vill du att jag inkluderar i sammanfattningen – pris, vad som ingår eller hur installationen fungerar?"

**Gör**
- Boka en ny tid.
- Skicka skriftlig information.
- Fråga om partnerns viktigaste fråga.

**Undvik**
Att försöka "lösa" partnern på telefon eller att pressa kunden att bestämma själv.`,
    source: 'internal',
    order: 117,
  },
  {
    id: 'bk-inv-fundera',
    service: 'brandkollen',
    category: 'invandning',
    title: 'Brandkollen: "Jag vill fundera"',
    summary: 'Ta reda på vad som är oklart. Fundera är sällan bara tidsbrist.',
    body: `**Svar**
"Absolut, det är rimligt. Vad är det du vill fundera på – priset, hur larmet fungerar, eller om det passar er bostad?"

**Om svaret är "bara tvivlar"**
"Vad skulle behöva vara sant för att du skulle känna dig trygg med att säga ja?"

**Om kunden inte vill säga**
"Jag skickar en kort sammanfattning. När passar det att jag hör av mig igen – i morgon eller nästa vecka?"

**Gör**
- Boka en avtalad återkomst.
- Dokumentera vad som är oklart.
- Sluta samtala på ett öppet sätt.

**Undvik**
Att skicka information utan att boka nästa steg.`,
    source: 'internal',
    order: 118,
  },

  /* ==================================================================
   * KONSUMENTKOLLEN
   * ================================================================ */
  {
    id: 'kk-manus',
    service: 'konsumentkollen',
    category: 'manus',
    title: 'Konsumentkollen — komplett manus',
    summary: 'Hela samtalet från uppringning till avslut.',
    body: `[UPPRINGNING]
"Hej, [NAMN]! Det är [DITT NAMN] från Label Lab. Jag ringer kort om tryggheten kring ditt personnummer. Har du en minut?"

[HOOK]
"De flesta vet inte förrän det redan har hänt: ett lån de inte har tagit, ett konto de inte har öppnat, en faktura som dyker upp. Det kallas ID-kapning, och det behöver inte vara din fysiska identitet – det räcker med ditt personnummer."

[BEHOV]
"Har du koll på om ditt personnummer används någonstans just nu?"
"Har du eller någon du känner drabbats av bedrägeri?"
"Vad skulle du vilja bli uppmärksammad på – lån, konton eller förändringar i kredituppgifter?"

[PRESENTATION]
"Konsumentkollen är en tjänst som bevakar ditt personnummer och ger dig aviseringar när något händer. Du får även kreditinformation, hjälp med spärrservice och bedrägeriassistans. Tanken är att du ska få veta tidigt – inte när inkassokravet redan ligger i brevlådan."

[ID-KAPNING — PEDAGOGISKT]
"ID-kapning är när någon använder din identitet utan ditt medgivande. Det kan handla om lån, abonnemang, konton eller köp. Du märker det ofta först i efterhand. Tjänsten hjälper dig att upptäcka och hantera det."

[PRIS OCH PAKET]
"Det finns olika paket beroende på hur många personer som ska ingå. Jag går igenom vad som passar er."

[AVSLUT]
"Ska vi starta bevakningen för dig och [ANTAL] personer? Jag behöver bara [UPPGIFTER]."`,
    bullets: [
      'Förklara ID-kapning med ett vardagsexempel.',
      'Fråga om kundens egen upplevelse innan du presenterar.',
      'Var tydlig med att tjänsten bevakar och aviserrar – inte att den garanterar att inget händer.',
      'Bekräfta paket, pris och bindningstid innan avslut.',
    ],
    source: 'official',
    sourceNote: OFFICIAL_KK,
    order: 200,
  },
  {
    id: 'kk-oppning',
    service: 'konsumentkollen',
    category: 'oppning',
    title: 'Konsumentkollen — öppning',
    summary: 'Öppna med ett igenkänbart problem, inte med en produktförteckning.',
    body: `**Varianter**
1. "Hej [NAMN], det är [DITT NAMN] från Label Lab. Jag ringer kort om tryggheten kring ditt personnummer. Har du en minut?"
2. "Hej [NAMN]! Har du koll på om ditt personnummer används någonstans just nu? Jag kan visa hur du får koll på det."
3. "Hej [NAMN], jag ringer inte för att sälja ett färdigt paket – jag vill först höra om du någonsin har funderat på vad som händer om någon använder ditt personnummer."

**Gör**
- Fråga om tid.
- Använd ett vardagsexempel.
- Lyssna efter kundens egen erfarenhet.

**Undvik**
- Att börja med en lång lista över tjänstens funktioner.
- Att säga "din identitet är stulen" som skrämseltaktik.`,
    source: 'internal',
    order: 210,
  },
  {
    id: 'kk-behov',
    service: 'konsumentkollen',
    category: 'behov',
    title: 'Konsumentkollen — behovsanalys',
    summary: 'Frågor som öppnar för samtal om trygghet och kontroll.',
    body: `**Erfarenhet**
- "Har du eller någon du känner blivit utsatt för bedrägeri eller ID-kapning?"
- "Har du någonsin upptäckt något konstigt i dina kredituppgifter?"

**Vardag och kontroll**
- "Hur koll har du på om ditt personnummer används för lån eller konton?"
- "Skulle du vilja bli aviserrad om något förändras?"
- "Vem i familjen skulle du vilja skydda?"

**Konsekvens**
- "Vad skulle vara värst – att inte få ett lån, att bli skuldregistrerad, eller att inte veta var det började?"
- "Hur mycket tid skulle du vilja lägga på att hålla koll själv?"

**Prioritering**
- "Vad är viktigast för dig: aviseringar, hjälp vid ett larm, eller tillgång till kreditinformation?"`,
    source: 'internal',
    order: 220,
  },
  {
    id: 'kk-idkapning',
    service: 'konsumentkollen',
    category: 'id-kapning',
    title: 'ID-kapning — pedagogisk förklaring',
    summary: 'Förklara med ett vardagsexempel. Hitta inte på tekniska detaljer.',
    body: `**Vad ID-kapning är**
"ID-kapning är när någon använder din identitet utan ditt medgivande – till exempel för att ta ett lån, teckna ett abonnemang eller öppna ett konto. Det behöver inte handla om en stulen ID-handling; ofta räcker det med ditt personnummer och personuppgifter."

**Hur det ofta märks**
"Du märker det ofta i efterhand: ett avslag på lån, en faktura du inte känner igen, eller en förändring i dina kredituppgifter. Därför är tidig avisering viktig."

**Vad tjänsten gör**
"Konsumentkollen bevakar ditt personnummer och aviserrar vid aktivitet. Du får också kreditinformation, spärrservice och bedrägeriassistans."

**Vad tjänsten inte är**
"Det här är ingen garanti mot att bli utsatt. Det är ett verktyg för att upptäcka tidigare och få hjälp att hantera det."

**Bra exempel**
"Om någon försöker teckna ett avtal med dina uppgifter vill du veta det så tidigt som möjligt – inte tre månader senare."`,
    source: 'official',
    sourceNote: OFFICIAL_KK,
    order: 230,
  },
  {
    id: 'kk-presentation',
    service: 'konsumentkollen',
    category: 'presentation',
    title: 'Konsumentkollen — tjänstepresentation',
    summary: 'Beskriv bevakning, avisering och hjälp – utan att lova garanterat skydd.',
    body: `**Vad den gör**
"Konsumentkollen bevakar ditt personnummer och ger dig aviseringar när något händer. Du får kreditinformation, hjälp med spärrservice och bedrägeriassistans."

**Hur du använder den**
"Du får en översikt och aviseringar. Om något händer får du vägledning om vad du kan göra."

**Vad den inte är**
"Det är ingen garanti för att bedrägeri inte kan ske. Det är ett sätt att upptäcka tidigare och att få stöd."

**Fråga tillbaka**
"Skulle du vilja ha den typen av koll på ditt personnummer?"

**Viktig avgränsning**
Säg inte att tjänsten "stoppar alla bedrägerier", "tar bort skulder" eller "kontaktar myndigheter automatiskt". Sådana påståenden kan inte verifieras.`,
    source: 'official',
    sourceNote: OFFICIAL_KK,
    order: 240,
  },
  {
    id: 'kk-fordelar',
    service: 'konsumentkollen',
    category: 'fordelar',
    title: 'Konsumentkollen — produktfördelar',
    summary: 'Välj de fördelar som matchar kundens behov.',
    body: `**1. Bevakning av personnummer**
"Tjänsten bevakar ditt personnummer och aviserrar vid aktivitet."

**2. Aviseringar**
"Du får veta när något händer – i stället för att upptäcka det långt senare."

**3. Kreditinformation**
"Du får tillgång till kreditinformation, så att du kan se din egen situation."

**4. Spärrservice**
"Du får hjälp med spärrservice om du behöver spärra något."

**5. Bedrägeriassistans**
"Om något händer får du vägledning och stöd."

**Regel:** Varje fördel ska kopplas till något kunden sa. "Du sa att du ville veta tidigt – då är aviseringarna det viktigaste för dig."`,
    source: 'official',
    sourceNote: OFFICIAL_KK,
    order: 250,
  },
  {
    id: 'kk-paket',
    service: 'konsumentkollen',
    category: 'paket',
    title: 'Konsumentkollen — paket och priser',
    summary: 'Priserna varierar efter kampanj och antal personer. Bekräfta alltid innan du lovar.',
    body: `**Principer**
- Priset beror på antal personer och aktuell kampanj.
- Bindningstid och uppsägningstid ska alltid framgå.
- Lova aldrig ett pris du inte har bekräftat för dagen.

**Kända kampanjnivåer (kontrollera aktuellt läge)**
- 129 kr/mån – 1 person
- 189 kr/mån – 2 personer
- 219 kr/mån – 5 personer
- 249 kr/mån – 5 personer
- 289 kr/mån – 5 personer

**Viktig markering**
Dessa nivåer kommer från ViPos kampanjsidor och kan ha ändrats. De är kampanjpriser, inte en garanti. Bekräfta med ledning vilket paket och pris som gäller för kunden framför dig.

**Så säger du det i samtalet**
"Det finns flera paket beroende på hur många ni är. Jag vill inte ge dig ett pris som inte stämmer – jag går igenom vad som gäller just nu."

**Så säger du det om kunden jämför**
"Vad ingår i det du jämför med? Här ingår bevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans."

**Källa**
https://www.vipo.se/konsumentkollen/ och aktuella kampanjsidor (2026-11-23).`,
    source: 'verify',
    sourceNote: VERIFY_PRICE,
    order: 260,
  },
  {
    id: 'kk-avslut',
    service: 'konsumentkollen',
    category: 'avslut',
    title: 'Konsumentkollen — avslut',
    summary: 'Gå från "kanske" till ett tydligt nästa steg.',
    body: `**Direkt avslut**
"Ska vi starta bevakningen för dig och [ANTAL] personer? Jag behöver bara [UPPGIFTER]."

**Val av avslut**
"Vill du börja med paketet för en person, eller ska vi inkludera hela hushållet?"

**Sammanfattande avslut**
"Jag sammanfattar: [PAKET], [PRIS] per månad, [BINDNINGSTID]. Du får bekräftelsen på [E-POST]. Ska jag skicka den nu?"

**Om kunden säger nej**
"Tack för att du tog dig tid. Ska jag skicka en kort sammanfattning så att du kan läsa i lugn och ro?"

**Undvik**
- Att lova att tjänsten stoppar alla bedrägerier.
- Att hitta på rabatter.
- Att avsluta utan att bekräfta paket, pris och bindningstid.`,
    source: 'internal',
    order: 270,
  },
  {
    id: 'kk-konkurrens',
    service: 'konsumentkollen',
    category: 'konkurrens',
    title: 'Konsumentkollen — konkurrenshantering',
    summary: 'Jämför inte UC, Mysafety eller banker med påståenden du inte kan verifiera.',
    body: `**Grundregel**
"Jag ska inte säga något om andra aktörer. Jag kan berätta vad Konsumentkollen gör."

**Om kunden har UC**
"Det är bra att du redan använder UC. Konsumentkollen är en annan typ av tjänst: bevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Vad är det du främst vill ha hjälp med?"

**Om kunden har Mysafety**
"Jag kommenterar inte Mysafety. Jag kan visa vad den här tjänsten gör och vad som ingår."

**Om kunden frågar 'är ni bäst?'**
"Jag vill inte påstå att vi är bäst. Det jag kan visa är vad som ingår och hur det fungerar."

**Undvik**
- "UC är dyrare."
- "Mysafety larmar inte lika bra."
- "Banken skyddar dig inte."
- Alla påståenden om konkurrenters funktioner eller priser.

**Källa**
${OFFICIAL_KK}`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelser är inte verifierade. Bekräfta med ledning innan du säger något om UC, Mysafety eller banker.',
    order: 280,
  },
  {
    id: 'kk-loop',
    service: 'konsumentkollen',
    category: 'loop',
    title: 'Konsumentkollen — loop och avslut',
    summary: 'Tre huvudloopar: tjänsten, dig som säljare och företaget.',
    body: `**Loop 1 — Tjänsten**
"Det handlar om att du ska få veta tidigare. Bevakning, aviseringar och hjälp när något händer. Vad vill du ha koll på först?"

**Loop 2 — Dig som säljare**
"Jag är den du pratar med om något är oklart. Jag kan inte lova att allt alltid går snabbt, men jag kan se till att du får tydliga svar och att vi följer upp."

**Loop 3 — Företaget**
"ViPo Säkerhetstjänster är verksamheten bakom tjänsten. Label Lab är partner och återförsäljare. Vi arbetar med trygghetstjänster och vill att du ska känna att du får ett rakt svar."

**Identifiera tveksamhet**
"Vad är det som känns oklart? Är det priset, vad som ingår, eller hur det fungerar?"

**Loopa tillbaka till rätt argument**
- Pris → "Vad ingår i det du jämför med?"
- Trygghet → "Vad skulle du vilja bli uppmärksammad på?"
- Förtroende → "Vad skulle behöva vara sant för att du skulle känna dig trygg?"
- Tid → "Jag kan skicka en kort sammanfattning – när passar det att vi pratar igen?"

**Gå på avslut**
"Ska vi ta det vidare? Jag behöver bara [UPPGIFTER]."

**Viktig avgränsning**
Säg inte att du är "personlig säkerhetsansvarig" eller har behörigheter du inte har. Beskriv din faktiska roll.`,
    source: 'internal',
    order: 290,
  },
  {
    id: 'kk-snabbvy',
    service: 'konsumentkollen',
    category: 'snabbvy',
    title: 'Konsumentkollen — tre huvudloopar (snabbvy)',
    summary: 'Snabbvy under pågående samtal: tjänsten, dig som säljare, företaget.',
    body: `**1. TJÄNSTEN — vad kunden får**
"Bevakning av personnummer, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Tanken är att du ska få veta tidigt."

**2. DIG SOM SÄLJARE — varför kunden kan lita på samtalet**
"Jag är din kontaktpunkt. Jag svarar på det jag kan och följer upp det jag inte kan svara på direkt."

**3. FÖRETAGET — vem som står bakom**
"ViPo Säkerhetstjänster står bakom tjänsten. Label Lab är partner och återförsäljare."

**Identifiera tveksamhet**
"Vad är det som känns oklart – pris, innehåll eller trygghet?"

**Loopa tillbaka**
- Pris → jämför vad som ingår.
- Innehåll → gå tillbaka till bevakning och aviseringar.
- Trygghet → gå tillbaka till att få veta tidigt och få hjälp.

**Avslut**
"Ska vi starta bevakningen för [ANTAL] personer?"`,
    quick: true,
    source: 'internal',
    order: 291,
  },
  {
    id: 'kk-faq',
    service: 'konsumentkollen',
    category: 'faq',
    title: 'Konsumentkollen — vanliga frågor',
    summary: 'Korta svar på det kunder frågar oftast.',
    body: `**Vad ingår?**
"Bevakning av personnummer, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Exakt innehåll framgår av ditt avtal."

**Märker jag om någon tar ett lån i mitt namn?**
"Tjänsten är till för att du ska få aviseringar och kunna agera tidigt. Jag kan inte lova att du får veta allt – men du får bättre koll än utan tjänsten."

**Kan ni ta bort skulder?**
"Nej. Tjänsten är ingen skuldsanering. Den hjälper dig att upptäcka och hantera bedrägerier."

**Hur många personer ingår?**
"Det beror på paket. Jag går igenom vad som passar er."

**Hur länge bindar jag mig?**
"Bindningstid och uppsägningstid framgår av avtalet. Jag vill inte lova något innan vi har gått igenom det."

**Kan jag säga upp?**
"Ja, enligt avtalets uppsägningstid. Jag visar gärna exakt vad som gäller."`,
    source: 'official',
    sourceNote: OFFICIAL_KK,
    order: 300,
  },

  /* ---------------- Konsumentkollen: invändningar ---------------- */
  {
    id: 'kk-inv-tid',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har inte tid"',
    summary: 'Korta av, boka ny tid eller få 30 sekunder.',
    body: `**Svar**
"Jag förstår. Jag kan göra det kort: det handlar om att få veta om ditt personnummer används. Får jag två minuter, eller ska jag boka en tid som passar bättre?"

**Om kunden fortfarande inte har tid**
"Ingen fara. När passar det bäst – idag efter jobbet eller imorgon förmiddag?"

**Gör**
- Erbjud ett kort alternativ.
- Boka en konkret tid.
- Skicka en kort sammanfattning.

**Undvik**
Att fortsätta prata efter att kunden sagt nej två gånger.`,
    source: 'internal',
    order: 310,
  },
  {
    id: 'kk-inv-intresserad',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag är inte intresserad"',
    summary: 'Ta reda på om det är tjänsten eller samtalet kunden inte är intresserad av.',
    body: `**Svar**
"Okej, jag ska inte försöka övertala dig. Får jag fråga en sak: är det tjänsten du inte är intresserad av, eller är det att bli uppringd?"

**Om det är tjänsten**
"Vad är det som inte känns relevant? Är det att du redan har koll, eller att du inte tror att det händer dig?"

**Om det är uppringningen**
"Jag förstår. Jag kan skicka information i stället så att du kan läsa själv. Vill du det?"

**Undvik**
- Att argumentera efter ett tydligt nej.
- Att ta nej personligt.`,
    source: 'internal',
    order: 311,
  },
  {
    id: 'kk-inv-forsakring',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har skydd via försäkringsbolaget"',
    summary: 'Försäkring och bevakning är olika saker. Respektera att kunden redan har skydd.',
    body: `**Svar**
"Det är bra att du har skydd via ditt försäkringsbolag. Försäkring och bevakning gör olika saker: försäkringen kan ersätta dig efter något hänt, medan bevakning handlar om att upptäcka tidigt. Konsumentkollen bevakar ditt personnummer och aviserrar vid aktivitet."

**Följfråga**
"Vet du om ditt försäkringsskydd omfattar ID-kapning och ger dig aviseringar?"

**Undvik**
Att påstå att försäkringsbolaget inte täcker något. Du vet inte vad kundens avtal innehåller.`,
    source: 'verify',
    sourceNote: 'Försäkringens innehåll varierar. Bekräfta med ledning innan du säger något om vad ett försäkringsbolag täcker.',
    order: 312,
  },
  {
    id: 'kk-inv-uppringd',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har redan blivit uppringd"',
    summary: 'Skilj dig från föregående samtal genom att fråga och lyssna.',
    body: `**Svar**
"Det förstår jag. Jag ska inte upprepa samma samtal. Får jag fråga vad den som ringde sa – och vad som kändes oklart?"

**Om kunden inte minns**
"Ingen fara. Jag kan kort förklara vad Konsumentkollen gör, och du avgör om det är något för dig."

**Undvik**
- Att kritisera den som ringde tidigare.
- Att påstå att du är "bättre" utan att visa det.`,
    source: 'internal',
    order: 313,
  },
  {
    id: 'kk-inv-recensioner',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har läst dåliga recensioner"',
    summary: 'Ta det på allvar. Fråga vad som stod och svara på det.',
    body: `**Svar**
"Tack för att du säger det. Vad var det du läste? Jag vill inte minska det – jag vill förstå vad som gjorde dig tveksam."

**Om det handlar om service**
"Det är klart att det ska vara lätt att få hjälp. Jag kan berätta hur du når oss och vad som händer om något blir fel."

**Om det handlar om att tjänsten inte hjälpte**
"Jag kan inte lova att allt alltid blir bra. Vad jag kan göra är att gå igenom vad som ingår och hur du får hjälp om något händer."

**Undvik**
- Att säga att recensionerna är fel.
- Att hitta på nya löften för att motverka kritik.`,
    source: 'verify',
    sourceNote: 'Recensioner och kundupplevelser varierar. Bekräfta med ledning hur ni hanterar klagomål.',
    order: 314,
  },
  {
    id: 'kk-inv-orolig',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag känner mig inte orolig"',
    summary: 'Sälj inte rädsla. Sälj kontroll och trygghet.',
    body: `**Svar**
"Det är bra att du känner dig trygg. Många av våra kunder känner också så – de vill bara ha koll om något ändå händer. Det handlar inte om att vara rädd, utan om att slippa tänka på det."

**Följfråga**
"Skulle du vilja ha en avisering om något ändras, utan att behöva hålla koll själv?"

**Undvik**
- Att måla upp skräckscenario.
- Att säga att kunden är naiv.`,
    source: 'internal',
    order: 315,
  },
  {
    id: 'kk-inv-fundera',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag vill fundera"',
    summary: 'Ta reda på vad som är oklart och boka en avtalad återkomst.',
    body: `**Svar**
"Det är okej. Vad är det du vill fundera på – priset, vad som ingår, eller om det passar dig?"

**Om kunden inte vill säga**
"Jag skickar en kort sammanfattning. När passar det att jag hör av mig igen?"

**Gör**
- Boka en konkret tid.
- Dokumentera vad som är oklart.
- Skicka skriftlig information.

**Undvik**
Att skicka information utan att boka nästa steg.`,
    source: 'internal',
    order: 316,
  },
  {
    id: 'kk-inv-uc',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har redan UC"',
    summary: 'Respektera valet. Jämför inte påståenden du inte kan verifiera.',
    body: `**Svar**
"Det är bra att du använder UC. Jag ska inte säga något om deras tjänst. Konsumentkollen är en annan typ av tjänst: bevakning av personnummer, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Vad är det du främst vill ha hjälp med?"

**Följfråga**
"Vill du ha aviseringar, eller är det främst kreditinformationen du är ute efter?"

**Undvik**
- "UC är dyrare/sämre."
- "UC larmar inte."
- Alla påståenden om UC:s funktioner eller priser.`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelse ej verifierad. Bekräfta med ledning.',
    order: 317,
  },
  {
    id: 'kk-inv-mysafety',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag har Mysafety"',
    summary: 'Kommentera inte konkurrenten. Fråga vad kunden har för behov.',
    body: `**Svar**
"Det är bra att du har ett skydd. Jag kommenterar inte Mysafety. Jag kan berätta vad Konsumentkollen gör och vad som ingår – så kan du jämföra själv."

**Följfråga**
"Vad är det du främst vill ha hjälp med – aviseringar, kreditinformation eller assistans?"

**Undvik**
Alla påståenden om Mysafetys funktioner, priser eller service.`,
    source: 'verify',
    sourceNote: 'Konkurrentjämförelse ej verifierad. Bekräfta med ledning.',
    order: 318,
  },
  {
    id: 'kk-inv-banken',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Banken skyddar mig"',
    summary: 'Banken skyddar dina pengar – bevakning handlar om din identitet.',
    body: `**Svar**
"Det är bra att din bank har skydd. Banken skyddar dina pengar och dina konton. Konsumentkollen handlar om din identitet och ditt personnummer – att upptäcka om någon använder dina uppgifter, och att få hjälp att hantera det."

**Följfråga**
"Vet du om din bank bevakar ditt personnummer, eller är det främst kontotransaktioner?"

**Undvik**
Att påstå vad kundens bank gör eller inte gör.`,
    source: 'verify',
    sourceNote: 'Bankens skydd varierar. Bekräfta med ledning innan du säger något om banker.',
    order: 319,
  },
  {
    id: 'kk-inv-bankid',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Alla sidor kräver BankID"',
    summary: 'BankID är en identifiering – inte samma sak som bevakning.',
    body: `**Svar**
"BankID är en säker identifiering, och det är bra att du använder det. Men BankID bevakar inte ditt personnummer. Om någon använder dina uppgifter på ett ställe där BankID inte krävs kan du ändå drabbas. Konsumentkollen handlar om att upptäcka den typen av aktivitet."

**Följfråga**
"Skulle du vilja ha en avisering om ditt personnummer används på ett sätt du inte känner igen?"

**Undvik**
Att påstå att BankID är dåligt eller osäkert.`,
    source: 'internal',
    order: 320,
  },
  {
    id: 'kk-inv-dyrt',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Det är för dyrt"',
    summary: 'Bryt ner och jämför vad som ingår. Hitta inte på rabatter.',
    body: `**Svar**
"Jag förstår. Vad ingår i det du jämför med? Här ingår bevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans. Ska jag gå igenom vad som passar er och vad det kostar per månad?"

**Pris i perspektiv**
"Vad kostar det att inte upptäcka det i tid? Jag vill inte skrämma dig, men det är värt att jämföra."

**Följfråga**
"Är det prisnivån eller vad som ingår som du är tveksam till?"

**Undvik**
- Att hitta på rabatter.
- Att lova att priset gäller för alltid.
- Att pressa med rädsla.`,
    source: 'verify',
    sourceNote: VERIFY_PRICE,
    order: 321,
  },
  {
    id: 'kk-inv-telefonforsaljning',
    service: 'konsumentkollen',
    category: 'invandning',
    title: 'Konsumentkollen: "Jag vill inte tacka ja till telefonförsäljning"',
    summary: 'Respektera valet. Erbjud skriftlig information istället.',
    body: `**Svar**
"Jag respekterar det. Då ska jag inte försöka sälja något i det här samtalet. Jag kan skicka information så att du kan läsa i lugn och ro – vill du det?"

**Om kunden inte ens vill ha information**
"Okej, jag tackar för tiden. Ha en bra dag."

**Gör**
- Sluta sälja.
- Erbjud skriftlig information.
- Låt kunden bestämma.

**Undvik**
- Att fortsätta argumentera.
- Att fråga varför kunden är negativ.
- Att ta nej personligt.`,
    source: 'internal',
    order: 322,
  },

  /* ==================================================================
   * GEMENSAMT
   * ================================================================ */
  {
    id: 'gem-loop-grunder',
    service: 'gemensamt',
    category: 'loop',
    title: 'Looping — grunderna',
    summary: 'En loop är inte att upprepa samma argument. Det är att byta ingång till samma behov.',
    body: `**Vad looping är**
Kunden säger nej, men behöver inte säga nej till själva behovet. En loop hjälper dig att ta reda på vad nej:et handlar om och återkoppla till rätt argument.

**De fyra stegen**
1. **Bekräfta:** "Det är rimligt att du vill jämföra."
2. **Förstå:** "Vad är det som känns oklart?"
3. **Återkoppla:** "Du sa att du ville ha koll på ditt personnummer – det är precis vad bevakningen gör."
4. **Avsluta:** "Ska vi ta det vidare?"

**Byt ingång om kunden fastnar**
- Behov → trygghet
- Trygghet → service
- Service → pris
- Pris → jämför vad som ingår

**Undvik**
- Att upprepa samma mening högre.
- Att argumentera mot kundens känsla.
- Att lova något du inte kan bekräfta.`,
    source: 'internal',
    order: 400,
  },
  {
    id: 'gem-avslut-grunder',
    service: 'gemensamt',
    category: 'avslut',
    title: 'Avslut — grunderna',
    summary: 'Ett avslut är en tydlig fråga om nästa steg.',
    body: `**Tre typer**
1. **Direkt avslut:** "Ska vi starta?"
2. **Val av avslut:** "Vill du börja med en person eller hela hushållet?"
3. **Sammanfattande avslut:** "Jag sammanfattar: [PAKET], [PRIS], [BINDNINGSTID]. Ska jag skicka bekräftelsen?"

**Gör**
- Fråga efter beslut när behovet är bekräftat.
- Var tyst efter frågan.
- Bekräfta paket, pris och bindningstid.

**Undvik**
- Att rabbla fler fördelar efter ett nej.
- Att lova något du inte kan bekräfta.
- Att avsluta utan nästa steg.`,
    source: 'internal',
    order: 410,
  },
  {
    id: 'gem-etik',
    service: 'gemensamt',
    category: 'faq',
    title: 'Etik och compliance',
    summary: 'Regler som alltid gäller – oavsett tjänst.',
    body: `**Alltid**
- Säg vem du är och vilket företag du representerar.
- Fråga om tid innan du börjar.
- Lova bara det du kan bekräfta.
- Var tydlig med pris, bindningstid och uppsägningstid.
- Respektera ett nej.

**Aldrig**
- Hitta på statistik, priser eller produktlöften.
- Påstå att en tjänst garanterar skydd.
- Prata ner konkurrenter.
- Lura fram ett ja med skrämseltaktik.
- Låtsas vara en myndighet, bank eller försäkringsbolag.

**Om du är osäker**
"Jag kontrollerar det och återkommer med ett rakt svar." Det är alltid bättre än en gissning.`,
    source: 'internal',
    order: 420,
  },
  {
    id: 'gem-priser',
    service: 'gemensamt',
    category: 'paket',
    title: 'Priser — policy och källor',
    summary: 'Priser är kampanjberoende. Ange källa och datum, bekräfta med ledning.',
    body: `**Policy**
- Priser och paket är redigerbara och ska förses med källa och datum för senaste godkännande.
- Kampanjpriser ska bekräftas med ledning innan de lovas.
- Säg alltid bindningstid och uppsägningstid.

**Källor**
- Konsumentkollen: https://www.vipo.se/konsumentkollen/
- Brandkollen: https://www.vipo.se/brandkollen/
- Kontakt och villkor: https://www.vipo.se/kontakt/
- Brandkollen huvudavtal: https://www.vipo.se/wp-content/uploads/huvudavtal_brandkollen_20230601.pdf

**Kända nivåer för Konsumentkollen (2026-01-28)**
- 129 kr/mån – 1 person
- 189 kr/mån – 2 personer
- 219 kr/mån – 5 personer
- 249 kr/mån – 5 personer
- 289 kr/mån – 5 personer

**OBS:** Dessa är kampanjpriser och kan ha ändrats. Bekräfta aktuellt paket och pris med ledning innan du använder dem i ett samtal.`,
    source: 'verify',
    sourceNote: VERIFY_PRICE,
    order: 430,
  },
  {
    id: 'gem-kallor',
    service: 'gemensamt',
    category: 'faq',
    title: 'Produktfakta och källor',
    summary: 'Officiella källor och vad som behöver bekräftas.',
    body: `**Officiellt verifierad produktinformation**
- Brandkollen (vipo.se/brandkollen, hämtad 2026-11-23): uppkopplad rök- och kolmonoxiddetektering, larm via ljud, SMS och samtal från larmcentral, vidarebefordran till anhöriga enligt larmplan, självtest varje timme, temperaturmätning dagligen, mobilnät utan app/WiFi.
- Brandkollen (huvudavtal 2023-06-01): enheten larmar kunden med ljud, SMS och till en fristående larmcentral som ringer kunden och därefter kontaktlistan i vald ordning. Larmcentralen hjälper till att larma SOS Alarm vid konstaterad rökutveckling; ViPo ansvarar inte för att polis, brandkår eller myndighet rycker ut. Kontaktlistan får inte innehålla polis, brandkår, väktarbolag eller myndighet. Enheten kräver täckning för Telias 4G-nät; ViPo garanterar inte nätåtkomst vid larm. Enheten är ViPos egendom och återlämnas vid avtalets slut (995 kr per enhet som ej returneras). Nya batterier skickas kostnadsfritt; kunden byter. Leverans normalt 3–5 arbetsdagar på distans. Ansvar vid uteblivet larm begränsat till självrisk, högst 3 000 kr.
- Konsumentkollen: personnummerbevakning, aviseringar, kreditinformation, spärrservice och bedrägeriassistans.

**Interna säljargument**
- Samtalstruktur, öppningar, behovsanalys, loop och avslut.
- Argumentation kring trygghet, kontroll och tidig varning.

**Kampanjpriser som behöver bekräftas**
- Alla priser och paket. Ange källa och datum och bekräfta med ledning.

**Länkar**
- https://www.vipo.se/brandkollen/
- https://www.vipo.se/konsumentkollen/
- https://www.vipo.se/kontakt/ (kundtjänst 042-12 19 11)
- https://www.vipo.se/wp-content/uploads/huvudavtal_brandkollen_20230601.pdf`,
    source: 'official',
    order: 440,
  },
];

export const SECTIONS_BY_ID = new Map(GUIDE_SECTIONS.map((s) => [s.id, s]));

export function sectionsFor(service: GuideService): GuideSection[] {
  return GUIDE_SECTIONS.filter((s) => s.service === service).sort((a, b) => a.order - b.order);
}

export function searchSections(query: string): GuideSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return GUIDE_SECTIONS;
  return GUIDE_SECTIONS.filter((s) => {
    const hay = [s.title, s.summary, s.body, ...(s.bullets || []), s.sourceNote].filter(Boolean).join(' ').toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });
}

export function copyManuscript(service: GuideService): string {
  const sections = sectionsFor(service).filter((s) => s.category !== 'snabbvy');
  return sections
    .map((s) => {
      const header = `## ${s.title}`;
      const summary = s.summary ? `*${s.summary}*\n\n` : '';
      const bullets = s.bullets?.length ? '\n\n' + s.bullets.map((b) => `- ${b}`).join('\n') : '';
      const source = s.source === 'verify' ? '\n\n_[Kontrollera med ledning]_' : '';
      return `${header}\n\n${summary}${s.body}${bullets}${source}`;
    })
    .join('\n\n---\n\n');
}

export function copySection(section: GuideSection): string {
  const bullets = section.bullets?.length ? '\n\n' + section.bullets.map((b) => `- ${b}`).join('\n') : '';
  const source = section.source === 'verify' ? '\n\n[Kontrollera med ledning]' : '';
  return `${section.title}\n\n${section.body}${bullets}${source}`;
}

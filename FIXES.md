# Fixar i denna version

## Vad som var fel (därför "Logga in" inte gjorde någonting)
1. **Krasch vid tomt lösenord** – Web Crypto (`HMAC`) tillåter inte noll-långa
   nycklar. När man klickade *Logga in* innan man skrivit något lösenord
   (eller om webbläsaren skickade ett tomt fält) kastades ett ouppfångat
   undantag i `/api/login` → servern svarade `500` med tom body.
2. **Klienten låste sig** – login-sidans JS gjorde `await n.json()` direkt.
   När bodyn var tom kraschade `JSON.parse`, knappen fastnade på
   *"Loggar in…"* och sidan navigerade aldrig vidare.
3. **Middlewaren kunde också krascha** – om `SELLER_PASSWORD`/`MANAGER_PASSWORD`
   saknades (eller var tomma) slog samma noll-lång-nyckel-bugg till i
   middleware, vilket orsakade en 500-loop som *kunde* se ut som "man
   kommer inte in" även med rätt cookie.
4. **Hälsokontrollen /api/health gick inte att nå** för att felsöka – den
   låg bakom auth-kontrollen. Nu är den öppen.
5. **Gammal/trasig klient fortfarande deployad** – er Vercel-sida kör en
   äldre bundle (den med `useState`-knappar i stället för riktiga
   `<label><input type="radio">`). Den nya versionen som finns här
   använder native `<form method=post action=/api/login>` så inloggning
   fungerar **även om JS inte laddar alls**.

## Ändrade filer
- `lib/auth.ts` – skyddar mot tomma lösenord (fallback-sträng i stället
  för krasch), `pwFor` returnerar `undefined` när lösenordet saknas.
- `app/api/login/route.ts` – hela routen i try/catch; tidigt utfall för
  tomt lösenord (401); korrekt `err.back('bad',400)` vid ogiltig JSON.
- `middleware.ts` – token-anropet i egen try/catch, hela middleware i
  yttre try/catch så ett fel aldrig blir en oändlig 500-loop.
- `app/login/page.tsx` – robust JS-hanterare med `try/catch/finally`;
  om fetch/kastar faller den tillbaka på native formulärsubmit;
  inaktiverar knappen under laddning med tydlig text; fler felkoder.

## Testat lokalt
- `POST /api/login` med rätt lös: `200 {ok:true}` + `sd_auth`-cookie.
- `POST /api/login` med fel/tomt lös: `401 {error:"pw"}` (ingen krasch).
- `GET /api/health` utan cookie: `200 {env:{…}, db:"…"}`.
- `GET /` med giltig cookie: `200` (inte omdirigerad till login).
- `GET /` utan cookie: `307 → /login`.
- `next build` går igenom utan varningar.

## Vercel-anteckning
Efter att ni pushar denna version, **kontrollera i Vercel → Project →
Settings → Environment Variables** att `SELLER_PASSWORD` och
`MANAGER_PASSWORD` verkligen är satta (de finns i er `.env.local` men
Vercel läser inte den filen automatiskt vid automatiska deploys från
GitHub – bara om ni deployar med `vercel --prod` från datorn). Det är
därför den gamla versionen på Vercel kunde krascha i middleware trots
att koden såg rätt ut på GitHub.

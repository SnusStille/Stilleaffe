#!/usr/bin/env bash
# End-to-end smoke test against a running Label Lab server + mock Supabase.
# Usage: bash scripts/e2e-local.sh [base]
# Passwords below belong to the LOCAL MOCK ONLY (scripts/mock-supabase.mjs + .env.local).
# They never exist in production — real accounts use scrypt hashes in Vercel Secrets.
set -u
BASE="${1:-http://127.0.0.1:3000}"
PASS=0; FAIL=0
STILLE_PW='StilleTest2026!'
check() { # name, condition-result (0/1), detail
  if [ "$2" = "0" ]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1 ${3:-}"; fi
}
cookie_of() { # username password -> prints token
  curl -s -i -X POST "$BASE/api/login" -H 'content-type: application/json' --data "{\"username\":\"$1\",\"password\":\"$2\"}" | grep -i '^set-cookie: ll_session=' | sed -E 's/^[Ss]et-[Cc]ookie: ll_session=([^;]*).*/\1/' | tr -d '\r'
}
api() { # token method path [json-body]
  local tok="$1" m="$2" p="$3" b="${4:-}"
  if [ -n "$b" ]; then curl -s -X "$m" "$BASE$p" -H "cookie: ll_session=$tok" -H 'content-type: application/json' --data "$b"; else curl -s -X "$m" "$BASE$p" -H "cookie: ll_session=$tok"; fi
}
code() { # token path
  curl -s -o /dev/null -w '%{http_code}' "$BASE$2" -H "cookie: ll_session=$1"
}

echo "== anonymous =="
H=$(curl -s "$BASE/api/health"); echo "$H" | grep -q '"ok":true' && echo "$H" | grep -q '"db":"ok"'; check "health public: ok + db ok, no env leak" $([ $? = 0 ] && ! echo "$H" | grep -q '"env"' && echo 0 || echo 1) "$H"
C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/"); check "/ redirects to login (302)" $([ "$C" = "307" ] || [ "$C" = "302" ] && echo 0 || echo 1) "$C"
C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/data"); check "/api/data anonymous → 401" $([ "$C" = "401" ] && echo 0 || echo 1) "$C"
C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/month"); check "/month anonymous → redirect" $([ "$C" = "307" ] || [ "$C" = "302" ] && echo 0 || echo 1) "$C"
R=$(curl -s -X POST "$BASE/api/login" -H 'content-type: application/json' --data '{"username":"affe","password":"nope","role":"manager"}'); echo "$R" | grep -q '"error"'; check "login with role in body cannot authenticate" $(echo "$R" | grep -q '"user"' && echo 1 || echo 0) "$R"
L=$(curl -s "$BASE/login"); echo "$L" | grep -q 'Label Lab'; check "login page renders Label Lab" $? 

echo "== brute force =="
for i in 1 2 3 4 5 6 7; do R=$(curl -s -X POST "$BASE/api/login" -H 'content-type: application/json' --data '{"username":"intruder","password":"wrong"}'); done
echo "$R" | grep -q 'För många försök'; check "7th wrong attempt is blocked (429 copy)" $?

echo "== login stille =="
RAW=$(curl -s -i -X POST "$BASE/api/login" -H 'content-type: application/json' --data "{\"username\":\"stille\",\"password\":\"$STILLE_PW\"}")
echo "$RAW" | grep -qi 'set-cookie: ll_session='; check "stille password (scrypt) accepted" $?
echo "$RAW" | grep -qi 'HttpOnly'; check "session cookie HttpOnly" $?
echo "$RAW" | grep -qi 'SameSite=lax'; check "session cookie SameSite=Lax" $?
echo "$RAW" | grep -qi 'Secure'; check "session cookie Secure (production)" $?
STILLE=$(echo "$RAW" | grep -i '^set-cookie: ll_session=' | sed -E 's/^[Ss]et-[Cc]ookie: ll_session=([^;]*).*/\1/' | tr -d '\r')
D=$(api "$STILLE" GET /api/data)
echo "$D" | grep -q '"username":"stille"'; check "/api/data me=stille" $?
echo "$D" | grep -q '"role":"seller"'; check "stille role derived server-side = seller" $?
[ "$(echo "$D" | grep -o '"username":"[a-z]*","display_name"' | sort -u | wc -l)" = "4" ]; check "team has 4 members" $?
python3 - "$D" <<'PY'
import json,sys
d=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
try:
    d=json.loads(sys.argv[1])
except Exception as e:
    print("json fail", e); sys.exit(1)
ok=True
for t in d['team']:
    if t['username']!='stille':
        for e in t['entries']:
            if 'note' in e or 'mood' in e or 'rating' in e or 'tags' in e:
                ok=False
mine=[e for e in d['myEntries']]
print("OTHER_ENTRIES_PRIVATE" if ok else "OTHER_ENTRIES_LEAK", len(mine), "own entries", all(e['seller_username']=='stille' for e in mine))
PY
echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); print('PRIV', all(('note' not in e and 'mood' not in e) for t in d['team'] if t['username']!='stille' for e in t['entries']), 'OWN', len(d['myEntries'])>0 and all(e['seller_username']=='stille' for e in d['myEntries']), 'KVIST_ENTRIES', len([t for t in d['team'] if t['username']=='kvist'][0]['entries']))"
echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if all(('note' not in e and 'mood' not in e and 'rating' not in e and 'tags' not in e) for t in d['team'] if t['username']!='stille' for e in t['entries']) else 1)"; check "other sellers' entries expose no notes/mood/rating/tags" $?
echo "$D" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if all(e['seller_username']=='stille' for e in d['myEntries']) else 1)"; check "myEntries only stille" $?

echo "== pages render for stille =="
for p in / /month /team /guide /settings /history /stats /goals /comments /ai; do C=$(code "$STILLE" "$p"); check "GET $p → 200" $([ "$C" = "200" ] && echo 0 || echo 1) "$C"; done
HTML=$(curl -s "$BASE/" -H "cookie: ll_session=$STILLE"); echo "$HTML" | grep -q 'Månadsresultat'; check "shell nav contains Månadsresultat" $?
! echo "$HTML" | grep -qi 'stilleaffe'; check "no StilleAffe branding in overview" $?
META=$(curl -s "$BASE/login"); echo "$META" | grep -q 'Label Lab'; check "login metadata Label Lab" $?
MAN=$(curl -s "$BASE/manifest.webmanifest"); echo "$MAN" | grep -q 'Label Lab'; check "manifest Label Lab" $?

echo "== permissions =="
R=$(api "$STILLE" POST /api/guide '{"id":"bk-manus","body":{"body":"x"}}'); echo "$R" | grep -q 'Bara chefer'; check "seller cannot edit guide (403)" $?
R=$(api "$STILLE" POST /api/entries '{"action":"upsert","entry_date":"2026-11-20","sales":5,"tb_sek":100,"seller_username":"kvist"}'); echo "$R" | grep -q '"ok":true'; check "seller upsert ok (identity forced to self)" $?
D2=$(api "$STILLE" GET /api/data); echo "$D2" | python3 -c "import json,sys; d=json.load(sys.stdin); k=[t for t in d['team'] if t['username']=='kvist'][0]['entries']; s=[e for e in d['myEntries'] if e['entry_date']=='2026-11-20']; print('stille2020', s[0]['sales'] if s else None, 'kvist_has_2020', any(e['entry_date']=='2026-11-20' for e in k)); sys.exit(0 if (s and s[0]['sales']==5) else 1)"; check "entry stored under stille (seller_username ignored)" $?
A=$(cookie_of affe 'AffeTest2026!')
[ -n "$A" ]; check "affe login ok" $?
DA=$(api "$A" GET /api/data); echo "$DA" | grep -q '"role":"manager"'; check "affe role = manager" $?
R=$(api "$A" POST /api/entries '{"action":"upsert","entry_date":"2026-11-20","sales":1,"tb_sek":1}'); echo "$R" | grep -q 'Bara säljaren'; check "affe cannot write entries (403)" $?
R=$(api "$A" POST /api/goals '{"monthly_sales":999}'); echo "$R" | grep -q 'Bara säljaren'; check "affe cannot change goals (403)" $?
R=$(api "$A" POST /api/guide '{"id":"bk-oppning","body":{"title":"Chefens rubrik"}}'); echo "$R" | grep -q '"ok":true'; check "affe can save guide override" $?
F=$(cookie_of fredland 'FredlandTest2026!')
[ -n "$F" ]; check "fredland login ok" $?
DF=$(api "$F" GET /api/data)
python3 - "$DA" "$DF" <<'PY'
import json,sys
a=json.loads(sys.argv[1]); f=json.loads(sys.argv[2])
a['me']=None; f['me']=None
print("SAME_TEAM_VIEW" if a['team']==f['team'] else "DIFFERENT_TEAM_VIEW")
sys.exit(0 if a['team']==f['team'] and a['activity']==f['activity'] else 1)
PY
check "fredland sees exactly affe's team view" $?
R=$(api "$F" POST /api/guide '{"id":"bk-oppning","body":{"title":"Fredlands rubrik"}}'); echo "$R" | grep -q '"ok":true'; check "fredland can edit guide like affe" $?
R=$(api "$F" POST /api/entries '{"action":"upsert","entry_date":"2026-11-20","sales":1,"tb_sek":1}'); echo "$R" | grep -q 'Bara säljaren'; check "fredland cannot write entries (403)" $?
for p in /month /team /guide /settings; do C=$(code "$A" "$p"); check "manager GET $p → 200" $([ "$C" = "200" ] && echo 0 || echo 1) "$C"; done

K=$(cookie_of kvist 'KvistTest2026!')
[ -n "$K" ]; check "kvist login ok" $?
DK=$(api "$K" GET /api/data); echo "$DK" | grep -q '"role":"seller"'; check "kvist role = seller" $?
echo "$DK" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if len(d['myEntries'])>0 and all(e['seller_username']=='kvist' for e in d['myEntries']) else 1)"; check "kvist sees only kvist's own entries as mine" $?
echo "$DK" | python3 -c "import json,sys; d=json.load(sys.stdin); s=[t for t in d['team'] if t['username']=='stille'][0]; k=[t for t in d['team'] if t['username']=='kvist'][0]; print('STILLE', s['goals']['monthly_sales'], len(s['entries']), 'KVIST', k['goals']['monthly_sales'], len(k['entries'])); sys.exit(0 if s['goals']['monthly_sales']==k['goals']['monthly_sales'] and len(s['entries'])!=len(k['entries']) else 1)"; check "goals stored separately, histories separate" $?
R=$(api "$K" POST /api/entries '{"action":"upsert","entry_date":"2026-11-20","sales":9,"tb_sek":900,"brandkollen_sales":4,"konsumentkollen_sales":5}')
echo "$R" | grep -q '"ok":true'; check "kvist registers the same date as stille (200)" $?
DK2=$(api "$K" GET /api/data); echo "$DK2" | python3 -c "
import json,sys; d=json.load(sys.stdin)
stille=[e for t in d['team'] if t['username']=='stille' for e in t['entries'] if e['entry_date']=='2026-11-20']
kvist=[e for t in d['team'] if t['username']=='kvist' for e in t['entries'] if e['entry_date']=='2026-11-20']
print('same-date rows', len(stille), len(kvist), stille[0]['sales'], kvist[0]['sales'], kvist[0]['brandkollen_sales'], kvist[0]['konsumentkollen_sales'])
sys.exit(0 if len(stille)==1 and len(kvist)==1 and stille[0]['sales']==5 and kvist[0]['sales']==9 and kvist[0]['brandkollen_sales']==4 else 1)"; check "two sellers, same date, separate rows, product split stored" $?
R=$(api "$K" POST /api/entries '{"action":"upsert","entry_date":"2026-11-20","sales":9,"tb_sek":900,"brandkollen_sales":8,"konsumentkollen_sales":5}')
echo "$R" | grep -q 'kan inte överstiga'; check "split > total rejected (400)" $?
R=$(api "$K" POST /api/entries '{"action":"upsert","entry_date":"2026-12-25","sales":1,"tb_sek":1}')
echo "$R" | grep -q 'framtidsdatum'; check "future date rejected" $?
R=$(api "$K" POST /api/goals '{"daily_sales":10,"daily_tb":1000,"weekly_sales":50,"weekly_tb":5000,"monthly_sales":200,"monthly_tb":20000}')
echo "$R" | grep -q '"ok":true'; check "kvist saves own goals" $?
DK3=$(api "$K" GET /api/data); echo "$DK3" | python3 -c "import json,sys; d=json.load(sys.stdin); s=[t for t in d['team'] if t['username']=='stille'][0]; k=[t for t in d['team'] if t['username']=='kvist'][0]; sys.exit(0 if k['goals']['monthly_sales']==200 and s['goals']['monthly_sales']==140 else 1)"; check "kvist's goal change does not touch stille's goals" $?
AUD=$(api "$K" GET /api/audit); echo "$AUD" | python3 -c "import json,sys; d=json.load(sys.stdin); it=d['items']; print('audit rows', len(it)); sys.exit(0 if it and all(i.get('seller_username')=='kvist' for i in it) else 1)"; check "audit for kvist shows only kvist's changes" $?
AUD=$(api "$A" GET /api/audit); echo "$AUD" | python3 -c "import json,sys; d=json.load(sys.stdin); it=d['items']; print('audit rows manager', len(it), sorted(set(i.get('seller_username') for i in it))); sys.exit(0 if any(i.get('seller_username')=='stille' for i in it) else 1)"; check "manager audit covers all sellers" $?
R=$(api "$K" POST /api/comments '{"body":"Hej från Kvist"}'); echo "$R" | grep -q '"ok":true'; check "kvist posts comment" $?
CM=$(api "$STILLE" GET /api/comments); echo "$CM" | grep -q 'Hej från Kvist'; check "comment visible to stille" $?
R=$(api "$A" POST /api/ai '{"messages":[{"role":"user","content":"hej"}]}'); echo "$R" | grep -q 'ANTHROPIC\|aktiverad'; check "AI without key → clear 503 message" $?
R=$(api "$STILLE" POST /api/entries '{"action":"delete","id":999999}'); echo "$R" | grep -q 'hittades inte'; check "delete of foreign/unknown id → 404" $?

echo "== logout =="
LO=$(curl -s -i -X POST "$BASE/api/logout" -H "cookie: ll_session=$STILLE"); echo "$LO" | grep -qi 'll_session=;'; check "logout clears cookie" $?

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" = "0" ]

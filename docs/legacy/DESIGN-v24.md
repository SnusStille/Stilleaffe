# StilleAffe v24

- Notiscentret flyttat från sidomenyns botten till topfältet. Panelen renderas nu via portal i `.app`, så den inte kan klippas av menyn. Läst/oläst sparas per dag i localStorage, klockan skakar när något nytt dyker upp, "Markera lästa" finns.
- Dagens mynthög (3D-mynt som fylls av riktiga sälj) och månadsnivå (Rookie→Wolf, baserad på månadens sälj; gränser 0/20/50/90/140 visas i kortet).
- Levande statusrad i motivationskortet utifrån verklig dagsstatus (ej registrerat / 0 / halvvägs / nära / klart).
- Klockan ringer en gång per dag när dagsmålet nås (ljud om ljud är på + kort guldglimt).
- Vybyte med djup (tabIn). Allt respekterar reducerad rörelse och "quiet depth".

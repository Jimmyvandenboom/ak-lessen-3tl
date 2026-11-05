# AK Lessen 3TL – vaste lesopbouw (ontwerp V11)

**Status:** functioneel ontwerp / werkdocument, **nog niet** een volledig gerealiseerd live platform.

## Doel

Eén herbruikbare online leeromgeving voor aardrijkskunde 3TL. Leerlingen openen een leslink via SOMtoday, melden zich aan en blijven in dezelfde leerlingomgeving. De docent bestuurt de les vanuit een eigen beveiligd portaal. Geen lokaal HTML-bestand of handmatig wisselen tussen leerling- en docententabbladen nodig.

De les *Energie in Frankrijk* is de eerste inhoudelijke testcase, niet het hele product.

## De zes vaste fasen

### 1. De Scan — Wat weet ik al?
- 5–10 diagnostische vragen, individueel, zonder rapportcijfer.
- Mix van begrippen, uitleg en bronvragen.
- Elke vraag krijgt een of meer onderwerp-tags (bijv. kernenergie, waterkracht).
- Systeem slaat antwoorden en onzekerheden per leerling op.
- Resultaten bepalen de Kennisboost, niet het openbare scorebord.

### 2. Kennisboost — Leer wat jij nodig hebt
- Gepersonaliseerde uitleg per kennishiaat, in begrijpelijke taal.
- Visuele bronnen: kaarten, illustraties, grafieken, schema's.
- Een ander oefenvoorbeeld dan de originele scanvraag.
- Korte check na de uitleg; bij fouten extra hulp, bij beheersing door.
- Ook leerlingen die alles goed hebben krijgen een verdiepingsroute.
- Leerlingen die eerder klaar zijn ontvangen een zelfstandige minichallenge.

### 3. Duo- of Solo Challenge — Spelend leren
- Docent kiest per les *solo* of *duo*, en kan achteraf leerlingen verplaatsen.
- Bij duo's koppelt de app waar mogelijk leerlingen met aanvullende sterke punten; 23 leerlingen = bij voorkeur 10 duo's en één drietal.
- Spelmechaniek: 3 levels met groeiende moeilijkheid; thema's komen terug uit de Scan en Kennisboost.
- In duo-modus: beide leerlingen antwoorden op hun eigen apparaat, gevolgd door korte bespreekfeedback; gezamenlijke bonus bij volledig juiste antwoorden.
- Bonussen kunnen bestaan uit een reeks goede antwoorden of goede uitleg; voorkom straf op basis van vooraf aanwezige kennishiaten.
- Docent kiest of tussenstand zichtbaar is; winnaar wordt pas na expliciete docentactie onthuld.
- Open antwoorden worden niet blind automatisch als goed/fout beoordeeld. De docent kan ze nakijken.
- Leerlingen krijgen een korte inhoudelijke uitleg bij antwoorden, niet alleen een groen/rood signaal.
- Voor wie klaar is: energiepuzzel of bonusopdracht zonder invloed op het cijfer.

### 4. Nieuwe inhoud — Ontdekken
- 1–2 nieuwe kernbegrippen of een nieuw toepassingsgebied.
- Start met een intrigerende bron, kaart, scenario of afbeelding.
- Korte uitleg (visueel en concreet), daarna actief verwerken.
- Minicheck om vast te stellen of de nieuwe leerstof begrepen is.
- Docent kan nieuwe inhoud per hoofdstuk configureren.

### 5. De Eindmissie — Laat zien wat je geleerd hebt
- Individueel, ook nadat leerlingen in een duo hebben gespeeld.
- Combinatie van korte automatisch controleerbare vragen en 1–2 open toepassingsvragen.
- Ten minste één vraag verbindt oude kennis met de nieuwe inhoud.
- Laat per onderwerp zien wat beter wordt beheerst; geen openbare vergelijking van individueel leervermogen.
- De docent ziet leeropbrengst, ontbrekende antwoorden en open vragen om te beoordelen.

### 6. Terugblik & Vooruitblik — Reflectie en keuze
- Wat heb je geleerd? Waar wil je nog extra hulp bij?
- Welke uitleg of oefenvorm hielp je?
- Keuze voor de opening van de volgende les (bronnenquiz, casus, debat, uitleg, enz.).
- Optionele docentgestuurde onthulling van challengewinnaar.
- Docent krijgt een begrijpelijk klasoverzicht.

## Overkoepelend: wachttaken en tempo
Elke fase heeft een 'Klaar?'-activiteit (2–4 min) zonder afhankelijkheid van een volgende lesfase. Snelle leerlingen kunnen verdiepingsvragen maken, zonder onbedoeld de volgende fase te openen. De docent heeft normale voortgang en tijdnoodmodus.

## Leerlingomgeving
- Eén vaste SOMtoday-link voor het platform; lescode of deeplink voor een specifieke les.
- Eigen login zonder e-mail via anonieme Supabase-sessie; eigen sessie op eigen apparaat.
- Meteen duidelijk: huidige fase, voortgang, wat nu moet, wat te doen als je klaar bent.
- Automatisch synchroniseren en bij heropenen de eigen voortgang herstellen op hetzelfde apparaat.
- Rustige weergave, toetsenbordvriendelijk, leesbaar op laptop, afbeelding als uitleg en niet als decoratie.
- Geen docentfuncties, onzichtbare antwoordmodellen en geen lijst van alle individuele leerlingresultaten.
- Geen schakelknop om zich zonder toestemming als docent voor te doen.

## Docentportaal
- Inloggen als bevoegde docent.
- Lesbibliotheek met hoofdstukken / lessen; lessen aanmaken uit dezelfde zes-fasen-template.
- Per les: doel, vakbegrippen, leerdoelen, bronnen, vraagbank per onderwerp, antwoordmodellen, toelichting, tijdsinstelling.
- Live sessie starten met unieke lescode; deelnemersaantal zien.
- Leerlingnamen en leeropbrengst alleen voor docent zichtbaar.
- Fasen starten, pauzeren, vrijgeven en overslaan; reserveplan met klassikale presentatie.
- Duo's automatisch voorstellen, handmatig goedkeuren en wijzigen.
- Antwoorden op open vragen beoordelen, teamstanden beheren, winnaar onthullen.
- Export of samenvatting na de les, met minimale persoonsgegevens en een duidelijke bewaartermijn.

## Technische principes
- **GitHub Pages** host de frontend; **Supabase** beheert sessies, resultaten, rechten en scores.
- Vakinhoud los van code: lesconfiguratie met zes fasen en onderwerp-getagde vraagbank. Niet steeds een nieuwe HTML-app per les maken.
- Alleen een publieke Supabase publishable key in de browser; nooit een service-role/secret key.
- RLS en gecontroleerde serverfuncties scheiden leerling- en docenttoegang.
- Punten worden op de server bepaald; leerlingclient mag geen willekeurig puntenaantal indienen.
- Elk antwoord heeft een stabiele vraag-ID en een idempotente opslagmethode.
- Voor klasgebruik: controle op herverbinden, dubbele invoer, browser-tab sluiting, afwezigheid, trio, offline melding en 23 gelijktijdige gebruikers.
- Eerst testen met fictieve leerlingen (twee apparaten, vijf apparaten, daarna klassimulatie) vóór echte klasdata.
- Voorgaande V10 blijft beschikbaar als archief en reserve; live V10 is een prototype, geen bewijs van productierijpheid.

## Eerste te realiseren verticale route
1. Leerling opent centrale link, voert lescode en naam in.
2. Docent ziet aanmelding.
3. Leerling maakt Scan: antwoorden per vraag op server en docent ziet voortgang.
4. Individuele Kennisboost reageert aantoonbaar op scanantwoorden.
5. Docent kiest Solo/Duo Challenge, beoordeelt voorgestelde indeling en publiceert teams.
6. Beide teamleden zien hun eigen spelvragen en gezamenlijke score.
7. Pas daarna Nieuwe inhoud, Eindmissie, terugblik en onthulling volledig aansluiten.

## Beslissingen (5 november 2026)
- De Confrontatie wordt geschrapt als afzonderlijke fase.
- Nieuwe standaardvolgorde: **Scan → Kennisboost → Duo/Solo Challenge → Nieuwe inhoud → Eindmissie → Terugblik & Vooruitblik**.
- Persoonlijke feedback is het belangrijkste didactische pluspunt.
- Online leerlingomgeving en apart docentportaal zijn harde vereisten.
- Dit is een herbruikbaar platform; niet opnieuw één losse app per hoofdstuk.

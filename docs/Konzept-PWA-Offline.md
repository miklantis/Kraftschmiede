# Kraftschmiede V2 – Konzept: Offline-Huelle & Update-Hinweis (PWA)

Status: Konzept zur Umsetzung in einem eigenen Projekt. Kein Code, keine Umsetzung in der
Migration V1->V2.

Dieses Dokument beschreibt eine **Neufunktionalitaet ueber V1 hinaus**. V1 hatte sie nie.
Sie gehoert bewusst **nicht** in das Migrationsprojekt (dort war das Ziel: V2 funktional und
optisch gleichwertig zu V1). Sie wird erst nach abgeschlossener Migration angegangen.

---

## 1. Worum geht es

Zwei zusammengehoerige Bausteine:

1. **Offline-Huelle.** Die App (Bildschirme, Logik, Layout – die „Huelle") wird beim ersten
   Besuch auf dem Geraet abgelegt. Danach startet und laeuft V2 auch komplett ohne Netz.
2. **Update-Hinweis im UI.** Wenn eine neue Version bereitsteht, sieht der Nutzer einen
   Hinweis „Neue Version verfuegbar", kann lesen **was drin ist**, und uebernimmt sie dann
   bewusst per Knopf.

Beides hat denselben Ausloeser: Sobald eine Huelle auf dem Geraet liegt, muss geregelt sein,
wie eine neue Version dorthin kommt – sonst klebt der Nutzer auf einer alten. Darum gehoeren
Offline-Huelle und Update-Hinweis in ein Konzept.

---

## 2. Ausgangslage (was bereits steht)

- **Installierbarkeit ist erledigt** (Migrationsprojekt, 2026-06-24). Manifest, Icons,
  Apple-Meta und Theme-Farbe sind von V1 uebernommen. V2 laesst sich auf den Homescreen
  legen und startet im Vollbild als eigene App. Das ist die Voraussetzung, nicht das Thema
  dieses Konzepts.
- **Die Datenschicht ist bereits offline-faehig.** Der Server-State (TanStack Query) wird in
  IndexedDB gespiegelt; Schreibvorgaenge laufen als pausierbare Mutationen und werden nach
  Reconnect/Neustart nachgeschickt. Heisst: **die Daten** liegen schon offline auf dem Geraet.
- **Was fehlt, ist allein die Huelle.** Heute laedt V2 die App-Dateien (HTML/JS/CSS) bei jedem
  Oeffnen frisch aus dem Netz nach. Ohne Netz kann das Geraet die Huelle nicht holen – die App
  bleibt leer, obwohl die Daten daneben liegen.
- **Schriften sind schon selbst gehostet** (`@fontsource`, im Build gebuendelt) – anders als V1,
  das Schriften von Google nachlud. Die Offline-Huelle ist dadurch sauber: keine externe
  Abhaengigkeit zur Laufzeit.

---

## 3. Was die Offline-Huelle leistet (und was nicht)

**Sie cacht die Huelle, nicht die Daten.** Klare Grenze, damit sich die zwei
Offline-Mechanismen nicht in die Quere kommen:

- **Service Worker** (die Technik dahinter) legt beim ersten Laden alle Build-Dateien ab:
  index.html, die JS-/CSS-Buendel, die Icons, die gebuendelten Schriften. Danach werden diese
  vom Geraet bedient – die App startet ohne Netz.
- **Supabase-Aufrufe (Daten) bleiben Sache der bestehenden TanStack-Schicht.** Der Service
  Worker fasst sie **nicht** an (keine Zwischenspeicherung von API-Antworten). Offline kommen
  die Daten weiterhin aus dem IndexedDB-Cache, Schreibvorgaenge aus der pausierten Mutation.
  So bleibt die schon funktionierende Datenlogik unberuehrt.

Ergebnis fuer den Nutzer: App auf den Homescreen, Flugmodus an, App oeffnen – Huelle vom
Geraet, Daten vom Geraet. Einheit durchziehen, eintragen; bei Reconnect wird nachgeschickt.

**Bewusst nicht dabei:** Push-Benachrichtigungen, Hintergrund-Sync ueber das hinaus, was
TanStack schon macht. Einzelnutzer-App – kein Bedarf.

---

## 4. Update-Verhalten (die gewuenschte Variante)

Entscheidung des Nutzers: **kein stiller Auto-Update, sondern ein sichtbarer, bewusster
Schritt.** Der Ablauf:

1. **Erkennen.** Im Hintergrund prueft die App (beim Start und gelegentlich), ob auf dem
   Server eine neue Version liegt. Wenn ja, ist die neue Huelle bereits geladen, aber noch
   **nicht aktiv** – sie wartet.
2. **Anzeigen.** Ein dezenter Hinweis-Streifen erscheint **oben auf der Trainingsseite**
   (der Startseite), nah am Trainingseinstieg, ueber Journey und Empfehlung: „Neue Version
   verfuegbar". Der Streifen ist antippbar und oeffnet ein Popup mit **„Was ist neu"** – den
   Aenderungen dieser Version als kurze, verstaendliche Liste. Ist die Liste lang, scrollt
   sie innerhalb des Popups. Das Popup nutzt das bestehende `Overlay`-Primitive
   (`src/components/ui/overlay.tsx`): Desktop zentriertes Fenster, Mobile Bodenblatt von
   unten – einheitlich mit den uebrigen Dialogen (Workout-Start, Sitzungsende). Aufbau im
   Popup: Titel „Was ist neu" mit Versionskennung im Kopf, darunter die scrollbare
   Stichpunktliste, unten der „Aktualisieren"-Knopf. Schliessen ohne Uebernehmen ueber das X
   im Kopf, Tippen neben das Blatt oder Escape (vom Primitive bereitgestellt); ein eigener
   „Spaeter"-Knopf entfaellt. Der Hinweis-Streifen bleibt stehen, bis der Nutzer uebernimmt.
3. **Uebernehmen.** Der Nutzer tippt „Aktualisieren". Die neue Huelle wird aktiv, die App
   laedt einmal neu, ist auf der neuen Version.
4. **Nicht stoeren.** Waehrend einer laufenden Einheit kommt der Hinweis nicht hoch bzw.
   laesst sich wegtippen; das Update wird nie mitten in eine Einheit gezwungen.

Begriffsklaerung (wichtig, weil leicht zu verwechseln):
- **App installieren** = einmalig auf den Homescreen legen. Auf iOS manuell ueber „Teilen ->
  Zum Homescreen" (iOS bietet dafuer keinen automatischen Knopf an). Das ist die
  Installierbarkeit aus Abschnitt 2, schon erledigt.
- **Update uebernehmen** = der „Aktualisieren"-Knopf im Hinweis. Funktioniert auf allen
  Plattformen programmatisch, auch auf iOS. Das ist gemeint, wenn der Nutzer sagt „dann kann
  ich das installieren".

---

## 5. Woher kommt der „Was ist neu"-Text

Vorschlag: eine gepflegte Datei `public/changelog.json` (oder `version.json`), die bei jedem
Deploy mitgeliefert wird. Inhalt je Version: eine Versionskennung und eine kurze, nutzerseitig
verstaendliche Stichpunktliste auf Deutsch.

- Beim erkannten Update holt die App diese Datei frisch vom Netz (sie ist nicht versioniert
  benannt, also liefert der Server immer die neueste = die der wartenden Version) und zeigt
  deren Stichpunkte als „Was ist neu". Da der Update-Hinweis ohnehin nur online erscheint,
  ist der Netz-Abruf unproblematisch.
- Das Pflegen dieser Datei wird Teil des Coach-Arbeitsablaufs: bei jeder Auslieferung ein
  Eintrag, in der gleichen verstaendlichen Sprache wie die Commit-/Plan-Notizen, aber fuer
  den Nutzer formuliert (kein Code-Detail).

**Versionskennung (entschieden):** je Eintrag eine Nummer im Schema
Hauptversion.Funktion.Korrektur (z. B. `1.0.20`) plus das Liefer-Datum. Im Popup-Kopf
zusammen angezeigt, etwa „Version 1.0.20 · 24.06.2026". Vergabe der Nummer durch den Coach:
pro normaler Auslieferung zaehlt die letzte Stelle hoch, bei groesseren Features springt die
mittlere Stelle; bei unklarem Sprung fragt der Coach kurz nach. Das Datum kommt vom Liefertag.

---

## 6. Technischer Weg (fuer die Umsetzung, knapp)

Diese Punkte sind fuer den spaeteren Bau gedacht, nicht zum Mitlesen noetig:

- **Werkzeug:** `vite-plugin-pwa` (nutzt Workbox). Erzeugt den Service Worker und die
  Precache-Liste automatisch aus dem Build (inkl. der gehashten Buendel), respektiert die
  Vite-`base` `/Kraftschmiede-v2/` und setzt den SW-Scope passend. Kein handgeschriebener SW.
- **Update-Strategie:** `registerType: 'prompt'` (nicht `autoUpdate`), damit der Schritt
  bewusst bleibt. Das Plugin meldet ueber `needRefresh`, dass eine neue Version wartet; der
  „Aktualisieren"-Knopf ruft `updateServiceWorker(true)` (skipWaiting + Reload).
- **Caching-Strategie:** Precache fuer die Huelle (App-Shell). Fuer Supabase-Requests **keine**
  Runtime-Caching-Regel (network-only / ignorieren), damit die TanStack-Persistenz die alleinige
  Datenquelle offline bleibt. App-Shell-Navigationen offline ueber `navigateFallback` auf die
  index.html unter der base.
- **Manifest:** das bereits vorhandene `public/site.webmanifest` (V1-Paritaet) beibehalten;
  das Plugin nur den SW erzeugen lassen, das Manifest nicht ueberschreiben (bzw. mit
  identischen V1-Werten spiegeln).
- **GitHub Pages / SPA-Fallback:** das bestehende `dist/404.html` (Kopie der index.html im
  Deploy) und der SW-`navigateFallback` muessen koexistieren; Deep-Links offline werden vom SW
  ueber die gecachte index.html bedient.
- **Notbremse:** Da Caching Nutzer auf alten Versionen „einsperren" kann, einen Weg vorsehen,
  den SW zu deregistrieren/Cache zu leeren (Einzelnutzer-App, geringes Risiko, aber sinnvoll).

---

## 7. Heikle Punkte / Risiken

- **Veralteter Cache.** Das groesste Risiko jeder Offline-Huelle. Mit `prompt`-Strategie +
  sichtbarem Update-Hinweis + bewusstem Uebernehmen ist es beherrschbar; trotzdem beim ersten
  Live-Betrieb genau beobachten, ob Updates verlaesslich ankommen.
- **iOS Safari.** Service Worker funktionieren fuer Homescreen-PWAs auf iOS, aber mit
  Eigenheiten (Storage-Eviction, SW-Lebenszyklus nach App-Kill). Kein automatischer
  Installations-Prompt – die Erst-Installation bleibt manuell ueber „Teilen". Das
  Update-Uebernehmen im laufenden Tab funktioniert.
- **base-Pfad.** SW-Scope, `navigateFallback` und Manifest muessen unter `/Kraftschmiede-v2/`
  stimmen – sonst greift der SW nicht oder faengt die falschen Routen ab.
- **Zwei Offline-Mechanismen.** Strikte Trennung Huelle (SW) vs. Daten (TanStack) einhalten,
  sonst kaempfen sie um dieselben Antworten.

---

## 8. Entscheidungen (Stand 2026-06-24) und Restoffenes

Getroffen:
- **Optik/Platzierung des Hinweises:** dezenter Streifen oben auf der Trainingsseite, ueber
  Journey und Empfehlung; antippbar; oeffnet ein Popup auf dem `Overlay`-Primitive mit
  scrollbarer „Was ist neu"-Liste und „Aktualisieren"-Knopf unten. Schliessen ohne
  Uebernehmen ueber X/Wegtippen/Escape; kein eigener „Spaeter"-Knopf. Details in Abschnitt 4.
- **Versionskennung:** Schema Hauptversion.Funktion.Korrektur (z. B. `1.0.20`) plus
  Liefer-Datum, im Popup-Kopf zusammen als „Version 1.0.20 · 24.06.2026". Nummernvergabe durch
  den Coach (letzte Stelle pro Auslieferung, mittlere bei groesseren Features). Details in
  Abschnitt 5.
- **Pruef-Intervall:** nur beim Start (bei der Service-Worker-Registrierung), keine
  periodische Pruefung im laufenden Betrieb (Einzelnutzer-App, beim naechsten Start kommt
  ein wartendes Update ohnehin hoch).
- **Changelog-Datei:** `public/changelog.json`, mit jedem Deploy ausgeliefert (bewusst nicht
  im Precache; wird beim Oeffnen des Popups frisch aus dem Netz geholt). Form: Liste von
  Versionen newest-first, je Eintrag `version`, `date` (ISO) und `changes` (kurze deutsche
  Stichpunkte). Das Popup zeigt den neuesten Eintrag (die wartende Version). Datum im
  app-ueblichen langen Format (z. B. „24. Juni 2026") statt rein numerisch.
- **Nach-Update-Bestaetigung:** bewusst weggelassen. Es ist ohnehin sichtbar, dass die App
  neu geladen hat, und der Hinweis-Streifen verschwindet nach dem Uebernehmen.

Offen: derzeit keine Punkte; das PWA-Vorhaben (Offline-Huelle + Update-Hinweis) ist
umgesetzt.

---

## 9. Vorgeschlagene Lieferungen (kleine, einzeln testbare Schritte)

1. **Offline-Huelle.** Service Worker einrichten (Precache der App-Shell, Supabase
   ausgenommen). Live-Test: Homescreen-App, Flugmodus, App startet und laeuft; eine Aenderung
   offline eintragen -> synct bei Reconnect (das tut sie schon).
2. **Update-Erkennung + Hinweis.** „Neue Version verfuegbar" + „Aktualisieren"-Knopf. Live-Test:
   neue Version deployen -> Hinweis erscheint -> uebernehmen -> App ist neu.
3. **„Was ist neu".** Changelog-Datei + Anzeige im Hinweis. Live-Test: Stichpunkte der neuen
   Version werden vor dem Uebernehmen angezeigt.
4. **Feinschliff.** Optik, „nicht waehrend einer Einheit", Notbremse, ggf. Nach-Update-Bestaetigung.

---

## 10. Bezug zu den anderen Dokumenten

- `docs/Masterplan-V2.md` – Gesamtkonzept der Migration (Schema, Architektur, Phasen). Quelle
  der Wahrheit fuer V2 als App.
- `PLAN.md` – Schritt-Liste/Fortschritt der Migration. Dort ist Phase 13 so geschnitten, dass
  Installierbarkeit erledigt ist und diese Offline-Huelle + Update-Hinweis bewusst hierher
  (eigenes Projekt) ausgelagert wurden.

Die Architektur-Leitplanken der Migration gelten weiter: reine, testbare Logikmodule
(DOM-frei), Datenzugriff in Hooks, wiederverwendbare Primitives, Validierung (tsc/build/Tests)
vor jedem Push.

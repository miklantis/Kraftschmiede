# Kraftschmiede

Browserbasierte Trainings-App (Vanilla JS, kein Build-Schritt). Funktioniert
lokal ohne alles und kann optional ueber **Supabase** geraeteuebergreifend
synchronisieren.

## Dateien

- `index.html` – Einstieg, laedt alle Skripte in fester Reihenfolge
- `styles.css` – Oberflaeche (Industrial-Dark-Theme)
- `config.js` – deine Supabase-Zugangsdaten (du traegst sie ein)
- `engine.js` – reine Rechen-Engine (1RM, Plate-Loader, Gewichtsvorschlaege …)
- `supabase.js` – optionale Cloud-Sync-Schicht (Anmeldung + Laden/Speichern)
- `data.js` – Seed-Daten, Domaenen-Helfer, Journey-Vorlagen und Schema-Migration
- `charts.js` – Diagramme (D3-Journey-Chart, Verlaufs-Charts) und Plate-Grafiken
- `live.js` – Live-Session, Pausen-Timer, Audio/Vibration, Start-/Ende-Dialoge
- `app.js` – App-Logik, Rendering und Verdrahtung der Module
- `schema.sql` – einmalig in Supabase auszufuehren (Tabelle + Sicherheitsregeln)

Ohne Cloud-Sync liegen die Daten im `localStorage` des Browsers (geraete- und
browsergebunden). Mit Sync ist `localStorage` der Offline-Zwischenspeicher und
Supabase die geraeteuebergreifende Quelle.

## Einrichtung Supabase

1. **Tabelle anlegen:** Supabase Dashboard -> *SQL Editor* -> *New query* ->
   Inhalt von `schema.sql` einfuegen -> *Run*.
2. **Anmeldung vereinfachen (empfohlen fuer den Eigenbedarf):**
   *Authentication* -> *Sign In / Providers* (bzw. *Settings*) -> die Option
   **"Confirm email" ausschalten**. Dann kannst du dich nach der Registrierung
   sofort anmelden. Laesst du sie an, musst du erst den Bestaetigungslink aus
   der E-Mail anklicken.
3. **Zugangsdaten eintragen:** *Project Settings* -> *API*. Kopiere
   **Project URL** und den **anon / public**-Key in `config.js`
   (`SUPABASE_URL` bzw. `SUPABASE_ANON_KEY`). Der anon-Key ist fuer den Browser
   gedacht und darf oeffentlich sein – die Daten schuetzt Row Level Security.
   Den `service_role`-Key niemals verwenden.

## App starten

- **Lokal:** `index.html` im Browser oeffnen (Doppelklick genuegt).
- **Im Web (optional):** das Repo z. B. ueber **GitHub Pages**
  (Repo-Settings -> *Pages* -> Branch waehlen) oder **Cloudflare Pages**
  (Repo verbinden) veroeffentlichen. Statisches Hosting reicht, weil das
  Backend bei Supabase liegt.

## Cloud-Sync benutzen

In der App: *Einstellungen* -> **Cloud-Sync**. Registrieren bzw. anmelden.
Bei der ersten Anmeldung wird dein aktueller lokaler Stand in die Cloud
geschrieben. Auf weiteren Geraeten meldest du dich mit denselben Daten an und
holst den Stand. Aenderungen werden danach automatisch gesichert (kurz
verzoegert). Manuell gehen "Jetzt sichern" und "Aus Cloud laden".

Hinweise:
- Beim Anmelden gewinnt der Cloud-Stand, falls vorhanden (er ueberschreibt den
  lokalen). Fuer einen Einzelnutzer ist das in der Regel gewollt.
- Die angehefteten Diagramme im Dashboard bleiben absichtlich lokal und werden
  nicht synchronisiert.

## Schema-Version

Datenschema 0.14. Die App migriert aeltere lokale Staende beim Laden.

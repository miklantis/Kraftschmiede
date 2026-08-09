# Kraftschmiede – Arbeitsanweisungen fuer Claude Code

## Rolle

Entwicklungspartner fuer die App Kraftschmiede: Bugfixing im laufenden Betrieb und
gezielte Weiterentwicklung (neue Features). Der Nutzer ist nicht technisch und liest
keinen Code – Aenderungen werden nach dem Push kurz und verstaendlich zusammengefasst,
kein Code im Chat/Output zeigen.

Kein Output wird als "final" bezeichnet, ausser ausdruecklich verlangt.

## Quellen der Wahrheit

Vor jeder Aenderung dort nachsehen statt aus dem Gedaechtnis zu arbeiten:

- `docs/Architektur.md` – Tech-Stack, Datenbank-Schema, Architektur-Leitplanken, Ist-Zustand
- `docs/adr/` – getroffene Architektur-Entscheidungen und Betriebs-Lernpunkte
- GitHub Issues des Repos – verbindliche Fortschrittsfuehrung (Struktur siehe unten)
- `docs/Issue-Konventionen.md` – Struktur, Labels, Ablauf der Issues im Detail
- `docs/Designsystem.md` – wiederverwendbare UI-Bausteine und Design-Tokens
- `docs/Muskel-Map.md` – Konzept der generischen Muscle-Map-Komponente
- `docs/archive/` – abgeschlossene Konzepte und Fortschritts-Verlauf vor Issues
  (`PLAN-Log-Archiv-<Jahr>-H1/H2.md`)
- `public/changelog.json` – aktuelle Version (Single Source), `versions`-Array

## Sicherheit

Niemals den service_role-Key committen. Im oeffentlichen Repo nur der anon-Key.
Keine Zugangsdaten oder Tokens in Code, Commits, Issues oder dieser Datei.

## Globale Leitplanken

- Globaler Look ("Klar"-Theme) bleibt bestehen, wird nicht neu erfunden.
- Domaenensprache deutsch (Uebung, Journey, Session, Vorlage, Phase, Coach) fuer Code,
  Doku, Commits und Issues. Architektur-/Code-Begriffe englisch.
- Neue Features sind erlaubt, aber jedes geht ueber Konzept-vor-Code.

## Konzept vor Code

Jedes neue Feature und jede nennenswerte Aenderung erst gemeinsam besprechen, bevor
gebaut wird:

- Funktionalitaet: was soll es koennen, macht das Sinn (Brainstorming ausdruecklich Teil
  davon)
- Elemente: welche Bausteine, was duerfen sie und was nicht
- Layout: Aufteilung und Verhalten auf Mobile und Desktop
- Komponentenschnitt: welche wiederverwendbaren Komponenten entstehen (intern technisch
  gruendlich durchdenken, dem Nutzer gegenueber verstaendlich erklaeren)

Erst bei Konsens wird gebaut. Bei kleinen Bugfixes oder reinen Setup-Schritten genuegt
eine kurze Abstimmung.

## Arbeitsmodus mit GitHub Issues

Fortschritt und Planung laufen ueber die GitHub Issues dieses Repos. Details in
`docs/Issue-Konventionen.md`.

**Issue-Pflicht (ausnahmslos):** Jede Aenderung an der App bekommt ein Issue – auch
Einzeiler, Hotfixes, Textkorrekturen, Style-Anpassungen, Abhaengigkeits-Updates und
Aenderungen, die der Nutzer nur beilaeufig im Chat erwaehnt. Kein Commit ohne
zugehoeriges Issue. Wenn beim Bauen zusaetzlich etwas Ungeplantes geaendert wird, bekommt
das ein eigenes Issue. Nur reine Doku-/Issue-Textpflege ohne Codeaenderung ist
ausgenommen.

**Issue anlegen heisst nicht umsetzen.** Das sind zwei getrennte Schritte. Oft wird nur
geplant: dann werden Issues angelegt und bleiben offen liegen, ohne dass Code angefasst
wird. Gebaut wird erst, wenn der Nutzer das ausdruecklich sagt – und nur das, was er
nennt. Ist unklar, ob nur geplant oder auch gebaut werden soll, vorher fragen statt
loszubauen. Nach dem Anlegen kurz melden, welche Issues entstanden sind, und dort
aufhoeren.

- Reihenfolge beim Umsetzen ist verbindlich: Issue anlegen (mit Labels) -> bauen ->
  validieren -> pushen -> Kommentar mit Commit-Verweis ins Issue -> Issue schliessen.
  Ist das Issue vor dem Push vergessen worden, wird es sofort nachtraeglich angelegt und
  mit dem Commit verknuepft, bevor irgendetwas anderes gemacht wird.
- Labels sind Pflicht, nie ohne: Ebene (`vorhaben` oder `schritt`) plus am Hauptvorhaben
  die Art (`typ:feature`, `typ:bugfix`, `typ:pflege`). Passt keine Art, vor dem Anlegen
  kurz nachfragen statt raten.
- Vor dem Anlegen kurz pruefen, ob es zum Thema schon ein offenes Issue gibt – dann dort
  weiterarbeiten statt ein Duplikat zu erzeugen.
- Zu Sitzungsbeginn offene Issues abrufen, Stand pruefen, kurz zusammenfassen wo wir
  stehen und was ansteht.
- Jedes Vorhaben ist ein Hauptvorhaben-Issue (Label `vorhaben` plus `typ:feature`,
  `typ:bugfix` oder `typ:pflege`).
- Vorhaben mit mehreren Lieferungen bekommen pro Schritt ein Schritt-Issue (Label
  `schritt`) als natives Sub-Issue. Nach dem Konzept-Gespraech die absehbaren
  Schritt-Issues gleich anlegen, beim Bauen bei Bedarf anpassen. Kleine, einstufige
  Bugfixes/Pflegepunkte bekommen kein Sub-Issue.
- Nach jedem umgesetzten Schritt: Kommentar ins Schritt-Issue (was geaendert wurde,
  Commit-Verweis, was live testbar ist), Schritt-Issue schliessen.
- Letzter Schritt eines Vorhabens fertig: zusammenfassender Kommentar im
  Hauptvorhaben-Issue, dann schliessen.
- Offen = laufend/geplant, geschlossen = abgeschlossen. Kein paralleles Tracking anderswo.

## Beim Bauen

- Ziel ist immer `main`: nur dort laeuft der Deploy, nur dort kann der Nutzer testen.
  Von sich aus keinen Feature-/Sitzungs-Branch anlegen.
- Gibt die Umgebung einen Branch vor und verbietet den Push auf `main` (z. B. Claude Code
  im Web), gilt diese Vorgabe. Dann laeuft die Auslieferung in einem Zug bis `main`
  durch: bauen, validieren, auf den Branch pushen, Pull Request anlegen, selbst mergen.
  Der Nutzer soll damit nichts zu tun haben und keine Merges selbst ausfuehren muessen –
  gemeldet wird erst das Ergebnis auf `main`. Nur wenn er ausdruecklich sagt, er will
  vorher draufschauen, wird vor dem Merge angehalten.
- Solange etwas nur auf einem Branch liegt, ist es fuer den Nutzer nicht testbar. Das nie
  als erledigt melden.
- Vor dem ersten Eingriff pruefen: Gibt es ein Issue dafuer? Wenn nein, zuerst anlegen
  (siehe Issue-Pflicht oben), erst dann Code anfassen.
- Betroffene Dateien frisch aus dem Repo lesen, Aenderungen bauen und validieren, dann
  committen und nach `main` ausliefern (direkt oder ueber den vorgegebenen Branch samt
  Pull Request, siehe oben).
- Nach dem Push nur kurz melden: geaenderte Dateien, Commit-Message (Betreff + Body),
  ein Satz was jetzt live testbar ist.
- Bei jeder Auslieferung `public/changelog.json` fortschreiben (Schema
  Hauptversion.Funktion.Korrektur, letzte Stelle bei normaler Auslieferung, mittlere bei
  groesseren Features) plus kurzer nutzerverstaendlicher Changelog-Eintrag ohne
  Code-Detail. Bei unklarem Versionssprung nachfragen.
- Bei groesseren oder heiklen Aenderungen erst Konzept/Plan zeigen statt direkt zu bauen.
- Kleine, abgegrenzte Schritte. Jeder Eingriff muss genau einmal greifen, sonst Abbruch
  und Ursache pruefen.

## Datenbank-Aenderungen (Migrationen)

Braucht eine Aenderung einen Eingriff in die Datenbank (neue Spalte, neue Tabelle, neue
Stammdaten wie Uebungen oder Skills), gilt immer:

1. Migrationsdatei im Repo anlegen: `supabase/migrations/<Nummer>_<kurzer_name>.sql`,
   fortlaufend nummeriert, mit Kopfkommentar (was, warum, fuer wen) und idempotent
   geschrieben (mehrfaches Ausfuehren darf nichts doppelt anlegen oder kaputt machen).
   Nutzersichtbare Texte in der Migration mit echten Umlauten, damit sie zum Seed passen.
2. Danach pruefen, ob der Supabase-Connector in dieser Sitzung verfuegbar ist.
   - **Verfuegbar:** die Migration selbst im Projekt ausfuehren, ohne Rueckfrage. Vorher
     kurz den Ist-Zustand abfragen (gibt es die Daten schon?), danach mit einer
     Kontroll-Abfrage pruefen, dass das Ergebnis stimmt. Beides kurz und
     nutzerverstaendlich melden.
   - **Nicht verfuegbar:** die Migration nicht raten und nicht ueberspringen, sondern
     deutlich melden, dass sie noch im Supabase-SQL-Editor ausgefuehrt werden muss, mit
     Dateiname und einem Satz, was sie bewirkt. Der Nutzer fuehrt sie dann selbst aus.

Migration und Code gehoeren zusammen in dieselbe Auslieferung. Die Datenbank haengt nicht
am Deploy: eine ausgefuehrte Migration wirkt sofort, der Code erst nach dem Push auf
`main` – bei der Rueckmeldung beides sauber auseinanderhalten.

## Token-sparsam arbeiten

- Gezielt lesen: nur betroffene Ausschnitte ansehen (grep, Zeilenbereiche), nicht
  ungefragt ganze Dateien neu einlesen.
- Build-/Testlauf-Ausgaben kompakt halten: nur Fehler bzw. letzte Zeilen zeigen.
- Kleine, einzeln testbare Schritte halten den Kontext pro Sitzung klein; grosse
  Vorhaben nicht in einer Sitzung durchziehen.
- Zu Sitzungsbeginn nur offene Issues knapp abrufen, nicht die volle Historie; einzelne
  Issues nur bei Bedarf im Detail oeffnen.

## Validierung vor jedem Push

- TypeScript-Typecheck (`tsc --noEmit`) ohne Fehler
- Build laeuft durch (`vite build`)
- Tests gruen (Vitest)
- Keine toten Verweise
- Issue vorhanden und korrekt gelabelt (siehe Issue-Pflicht) – fehlt es, erst anlegen,
  dann pushen

Reine Doku-Aenderungen (Markdown in `docs/`, README) brauchen keinen Build-/Testlauf,
nur Pruefung auf gueltige interne Links und – bei `changelog.json` – gueltiges JSON.
Issue-Texte brauchen keine Validierung.

## Commit-Messages

- Eine Auslieferung = ein Commit, mit Betreff und Body.
- Betreff: knapp, ca. 50-72 Zeichen, beschreibt das Ergebnis, kein Punkt am Ende.
- Body: kurze Stichpunkte oder Prosa – was geaendert wurde und warum, betroffene
  Dateien/Funktionen, was bewusst unberuehrt blieb. Durchgefuehrte Validierung kurz
  bestaetigen.
- Deutsch, echte Umlaute (ä ö ü ß), keine Emojis.

## Antwortstil

Deutsch, knapp und direkt, ohne Fuelltext, ohne Emojis. Echte Umlaute, nie ae/oe/ue.

# Kraftschmiede V2 – Konzept: Einheit bearbeiten (Verlauf)

Status: Konzept abgestimmt, noch nicht umgesetzt. Die Bauschritte 2a/2b/2c stehen als To-do
in `PLAN.md` (Vorhaben „Verlauf: Satz-Darstellung & Bearbeiten", Schritt 2). Erst nach
Freigabe wird in kleinen, einzeln testbaren Schritten gebaut.

Dieses Dokument ist Schritt 2 des Vorhabens „Verlauf: Satz-Darstellung & Bearbeiten".
Schritt 1 (satzweise Anzeige im Verlauf) ist bereits ausgeliefert und live getestet.

---

## 1. Worum geht es

Eine bereits abgeschlossene Einheit im Verlauf lässt sich nachträglich korrigieren: ein
vertippter Wert, ein vergessener Satz, eine falsche Dauer. Dafür öffnet sich ein
Bearbeiten-Panel, das aussieht wie die Live-Karte während des Trainings – aber ohne jeden
Ablauf: kein aktiver Satz, kein Abhaken, kein Timer, keine Stoppuhr, keine Stangen- oder
Scheibenwahl. Es zeigt die gespeicherten Werte und macht sie antippbar.

Das gilt für alle drei Einheit-Typen: Kraft, Skill und Yoga.

## 2. Einstieg

Ein Tipp auf eine Karte im Verlauf klappt sie weiterhin auf und zeigt die Satz-Übersicht
(das Ergebnis aus Schritt 1) – diese Schnellansicht bleibt unverändert. In der aufgeklappten
Karte kommt neben „Eintrag löschen" ein zweiter Knopf „Bearbeiten" hinzu. So bleiben „kurz
reinschauen" und „ändern" sauber getrennt.

## 3. Grenzen (bewusst gesetzt)

- **Coach nachziehen – nur bei der jüngsten Einheit.** Korrigiert man die zuletzt
  absolvierte Einheit einer Übung, zieht der Coach das nächste Arbeitsgewicht und die
  1RM-Schätzung sauber nach. Korrigiert man eine ältere Einheit, bleibt die aktuelle
  Empfehlung stehen – sie stammt bereits aus einer neueren Einheit, und ein alter Wert würde
  den Coach sonst zurückwerfen. Der Verlaufseintrag selbst wird in beiden Fällen korrigiert.
  Details in Abschnitt 8.
- **Aufwärmsätze bleiben unberührt.** Das Panel zeigt – wie die Anzeige heute auch – nur die
  Arbeitssätze und ändert nur diese. Vorhandene Aufwärmsätze bleiben beim Speichern erhalten.
- **Das Datum ändert sich nicht.** Es wurde beim Eintragen gesetzt. Anpassbar ist nur die
  Dauer der Einheit (für Nachträge).

## 4. Elemente je Typ

- **Kraft:** Kopf mit Übungsname; je Arbeitssatz eine Zeile mit Wdh, kg und der RIR-Auswahl
  (genau wie live), dazu „+ Satz" / „– Satz". Mehrere Übungen untereinander.
- **Skill:** je Satz das Ergebnis – bei Haltezeit Sekunden, bei Wiederholungen Wdh – als
  einfaches Zahlenfeld (kein Stoppuhr-Lauf). Keine RIR-Spalte. „+ Satz" / „– Satz".
- **Yoga:** kein Satz-Block – nur die Minuten und ein Notizfeld. Die Notiz ist in der App
  bisher nirgends eingebbar; hier kommt sie als kleiner Zusatznutzen mit hinein.
- **Für alle Typen:** oben ein Feld „Dauer" in Minuten. Bei Yoga ist das ohnehin die
  Minuten-Angabe der Einheit; bei Kraft und Skill steuert es die gespeicherte Dauer.

Unten im Panel: „Speichern" und „Abbrechen". Abbrechen verwirft alle Änderungen, Speichern
schreibt sie zurück in die Einheit, die Übungen und die Sätze.

## 5. Layout

Das Panel läuft auf dem bestehenden Overlay-Baustein: am Desktop ein zentriertes Fenster, am
Handy ein von unten hereinfahrendes Bodenblatt, der Inhalt scrollt bei Bedarf intern. Gleiche
Optik wie „Yoga eintragen" und „Was ist neu". Bewusst kein eigener Vollbild-Layer wie bei der
laufenden Live-Session.

## 6. Komponentenschnitt / Wiederverwendung (Kernpunkt)

Die Live-Karten werden **wiederverwendet**, nicht nachgebaut. `ExerciseLiveCard` (Kraft) und
`SkillLiveCard` (Skill) erhalten einen „Bearbeiten-Modus", der im Bearbeiten-Fall genau das
abschaltet, was zum Ablauf gehört:

- Stangenauswahl: ausgeblendet bzw. gelockt (nicht änderbar).
- Scheiben-Anzeige (Restplates): aus.
- Haken-Spalte und der „aktive Satz"-Effekt: weg.
- Aufwärmsätze: nicht gezeigt.
- **Editierbar wie live:** Wdh, kg und RIR über dasselbe fokus-erhaltende Tippfeld
  (`LiveNumberInput`). „+ Satz" / „– Satz" bleiben.
- Bei Skill ersetzt im Bearbeiten-Modus ein einfaches Sekunden- bzw. Wdh-Feld die Stoppuhr;
  „+ Satz" / „– Satz" kommen dort hinzu.

So bleibt die Karte die eine Quelle für die Optik – live wie beim Bearbeiten. Neu entsteht nur
der Panel-Rahmen drumherum (auf dem Overlay), das Dauer-Feld und die Speichern/Abbrechen-Leiste.

## 7. Zurückschreiben (Datenfluss)

Beim Öffnen baut das Panel aus den gespeicherten Werten einen Bearbeiten-Entwurf, den die
Tippfelder verändern. Beim Speichern wird dieser Entwurf zurückgeschrieben: die Einheit
(Dauer, bei Yoga Minuten und Notiz) aktualisiert, geänderte Arbeitssätze aktualisiert, neu
ergänzte Sätze angelegt, entfernte Sätze gelöscht. Abbrechen verwirft den Entwurf, ohne etwas
zu schreiben.

Das Zurückschreiben wird in einem eigenen Hook gekapselt – nach demselben Muster wie das
Speichern einer Live-Einheit: offline-fest, sodass eine ohne Netz vorgenommene Änderung einen
App-Neustart übersteht und bei Reconnect nachgereicht wird. Die Karten und die Verlaufsseite
kennen die Datenbank nicht direkt.

## 8. Coach nachziehen – Regel im Detail

Der Coach merkt sich pro Übung zwei Dinge aus der jüngsten Einheit: das nächste
Arbeitsgewicht (der schwerste geschaffte Arbeitssatz) und die geschätzte 1RM (mit Datum).

Beim Speichern einer Bearbeitung wird je betroffener Übung geprüft, ob die bearbeitete Einheit
die jüngste ist, die diese Übung enthält:

- **Ja:** Arbeitsgewicht und 1RM-Schätzung werden aus den korrigierten Arbeitssätzen neu
  berechnet und im Katalog fortgeschrieben.
- **Nein:** Es existiert eine neuere Einheit mit dieser Übung; die aktuelle Empfehlung bleibt
  unangetastet. Nur der Verlaufseintrag wird korrigiert.

So kann das Korrigieren eines alten Eintrags die laufende Progression nicht zurückwerfen.

## 9. Bauschritte (klein, einzeln testbar)

- **2a – Kraft:** Bearbeiten-Modus für `ExerciseLiveCard`, Panel-Rahmen, Dauer-Feld,
  Zurückschreiben für Kraft-Einheiten inklusive Coach-Nachziehen nach der Regel oben.
- **2b – Skill:** Bearbeiten-Modus für `SkillLiveCard` (Sekunden-/Wdh-Feld statt Stoppuhr),
  Skill-Einheiten zurückschreiben.
- **2c – Yoga und Dauer-Feinschliff:** Yoga-Körper (Minuten + Notiz), Dauer-Feld über alle
  Typen vereinheitlicht.

## 10. Offene Punkte (vor dem jeweiligen Bauschritt klären)

- **Skill-Fortschritt nachziehen.** ENTSCHIEDEN (Bauschritt 2b, mit Nutzer abgestimmt): Ein
  korrigiertes Skill-Ergebnis zieht den Phasenfortschritt (`skill_progress`) NICHT rückwirkend
  nach. Begründung: Die Phase ist ein gespeicherter Stand (kein aus der Historie neu
  berechneter); eine Rückberechnung könnte dich überraschend in eine andere Phase verschieben.
  Korrektur berichtigt nur den Eintrag, die Phase bleibt unverändert.

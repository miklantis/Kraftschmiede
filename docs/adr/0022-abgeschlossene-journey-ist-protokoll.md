# ADR-0022 – Eine abgeschlossene Journey ist ein Protokoll, kein Plan

**Status:** akzeptiert
**Datum:** 2026-08-25

## Kontext

Die Sätze einer Einheit sind seit jeher sicher: Übungsname, Sätze, Wiederholungen und
Gewichte werden beim Beenden als Kopie in `session_exercises`/`sets` geschrieben. In einer
gespeicherten Einheit kann keine Übung auftauchen, die dort nie gemacht wurde.

Der Workout-Name war es nicht. `sessions.template_id` ist ein Verweis, der Name steht allein
in `templates`. Wer ein Workout umbenennt oder umbaut, ändert damit rückwirkend, was eine
längst abgeschlossene Journey erzählt – aus „Ganzkörper A" wird im Rückblick der Name von
heute, obwohl damals etwas anderes trainiert wurde. Dasselbe gilt für jede Liste, die aus
den heutigen Workouts statt aus den absolvierten Einheiten abgeleitet wird.

## Entscheidung

**Eine abgeschlossene Journey ist ein Protokoll, kein Plan.** Alles Rückblickende wird aus
den absolvierten Einheiten abgeleitet, nie aus den heutigen Workouts. Bis zum Abschluss darf
sich alles bewegen, danach nichts mehr.

Daraus folgen vier Festlegungen:

**Eingebrannt wird beim Abschluss der Journey, nicht beim Beenden der Einheit.** Solange die
Journey läuft, ist sie ein Plan: Ein Umbenennen zieht überall mit, auch in den Einheiten,
die schon gemacht sind. Erst der Abschluss macht daraus ein Protokoll.

**Abgelegt wird an der Einheit** (`sessions.template_name`, Migration 0053), nicht an der
Journey-Zuordnung `journey_workouts`. Die Einheit ist das, was tatsächlich stattgefunden
hat; die Zuordnung sagt nur, was vorgesehen war.

**Beide Wege, auf denen eine Journey endet, brennen ein** – der Kalender-Abschluss
(ADR-0017) und der Journey-Wechsel. Beide laufen ohnehin durch `archiveJourney`; das
Einbrennen liegt daneben in `journeyWrite`, an genau einer Stelle (ADR-0019).

**Die Reihenfolge ist erst einbrennen, dann archivieren.** Bricht der Vorgang dazwischen ab,
bleibt die Journey aktiv, die Abschluss-Bedingung ist beim nächsten Öffnen unverändert wahr
und der Vorgang holt sich selbst nach (ADR-0017). Andersherum bliebe eine archivierte
Journey ohne Namen zurück, und niemand käme mehr vorbei, um sie nachzutragen.

## Konsequenzen

- **Dieselbe Einheit kann in Verlauf und Rückschau unterschiedlich heißen.** Der
  Trainingsverlauf bleibt die lebende Sicht und löst den Namen weiter aktuell auf; die
  Rückschau zeigt den eingebrannten. Das ist gewollt: Der Verlauf beantwortet „was mache ich
  mit diesem Workout", die Rückschau „was habe ich damals gemacht".
- **Ohne eingebrannten Namen wird wie bisher aufgelöst.** Die laufende Journey trägt noch
  keinen, ihre Einheiten heißen deshalb überall gleich.
- **Eine gelöschte Vorlage hinterlässt einen leeren Namen.** Einen Namen zu erfinden wäre
  schlimmer als keiner; die Rückschau zeigt solche Einheiten unter „Ohne Workout".
- **Der Bestand wurde einmalig mit dem heutigen Namen gefüllt** (Migration 0053) – der Stand
  von heute, nicht der von damals. Bewusst in Kauf genommen, damit es keinen dauerhaften
  Sonderfall „alt ohne Namen" gibt.
- **Rückblickende Listen zählen Einheiten, nicht Zuweisungen.** Ein Workout, das einer
  Journey zugewiesen, aber nie trainiert wurde, steht in ihrer Rückschau nicht.
- Der Grundsatz gilt über den Workout-Namen hinaus: Jede künftige Rückblick-Anzeige leitet
  aus den Einheiten ab. Was dafür noch fehlt (etwa Übungen, die aus einem Workout entfernt
  wurden), ist eigener Umfang.

# ADR-0020 – Der Live-Store bleibt ein Modul

**Status:** akzeptiert
**Datum:** 2026-08-20

## Kontext

Der geräte-lokale Store `src/hooks/useLiveSession.ts` hält den Zustand der laufenden
Einheit, sichert ihn im Gerätespeicher und löst die Seiteneffekte aus (Ton, Pause, Uhr).
Er ist über die Zeit gewachsen: Kraft-Einheit, Skill-Einheit, 1RM-Test, Pausen,
Aufwärmen, Dauer-Timer, Scheiben-Anzeige, mehrere Popup-Zustände.

Das Entscheiden und Umformen ist bereits herausgezogen – es liegt vollständig in reinen
Funktionen ohne React-, DOM- oder Datenbank-Bezug (`lib/live*`), jede mit eigenen Tests.
Der Store selbst enthält keine Datenumformung mehr.

Damit stand die naheliegende nächste Frage an: Soll auch der Store zerlegt werden – etwa
in einen für die Einheit, einen für die Pause, einen für die Uhr? Die üblichen Argumente
sprechen dafür: kleinere Module, klarere Zuständigkeit, leichter zu testen.

## Entscheidung

**Der Store bleibt ein Modul.** Drei Gründe, in dieser Reihenfolge:

- **Die Sicherung hängt an einem einzigen Speicher-Schlüssel.** Der Zustand der laufenden
  Einheit wird im Gerätespeicher gesichert und zwischen offenen Tabs abgeglichen. Mehrere
  Stores hießen mehrere Schlüssel, die beim Sichern und beim Abgleich zueinander passen
  müssten – und die auseinanderlaufen können, wenn ein Tab abstürzt.
- **Start, 1RM-Test-Start und Beenden setzen mehreres in einem Zug.** Sie setzen die
  Einheit *und* die flüchtigen Felder – Pause, Scheiben-Anzeige, Skill-Uhr,
  Popup-Zustände, gemeinsam in `TRANSIENT_RESET`. Getrennte Stores würden daraus zwei
  Benachrichtigungen machen und damit einen sichtbaren Zwischenstand erzeugen: Panel schon
  weg, Pausenleiste noch da. Das ist kein theoretischer Fall, sondern genau der Moment, in
  dem der Nutzer hinsieht.
- **Ein Testgewinn wäre nicht zu erwarten.** Hooks und Stores sind ungetestet, solange
  keine Test-Bibliothek für React installiert ist. Die Zerlegung würde also Module
  schaffen, die genauso ungetestet sind wie das eine heute – der übliche Hauptgrund für
  eine Zerlegung entfällt hier.

**Was bewusst im Store geblieben ist**, obwohl es nach Fachlogik aussieht: das Umschalten
der Scheiben-Anzeige (`cyclePlateMode`) – reine Anzeige, keine Fachregel – und die
Skill-Uhr, die nur festhält, welche Uhr gerade läuft.

## Konsequenzen

- **Der Store ist das größte Modul der App und bleibt es.** Wer etwas am Live-Training
  ändert, landet in dieser Datei, unabhängig davon, welchen Teil er meint.
- **Er ist ungetestet, und das fällt nicht auf.** Die Tests daneben decken die reinen
  Funktionen ab und sind grün, auch wenn der Store sie falsch verdrahtet. Die Absicherung
  endet an der Grenze zwischen „entscheiden" und „halten".
- **Die Abwägung ist an eine Bedingung geknüpft.** Kommt eine Test-Bibliothek für React
  dazu, fällt der dritte Grund weg. Dann ist die Zerlegung neu zu bewerten – die beiden
  ersten Gründe (ein Speicher-Schlüssel, ein Zug beim Setzen) bleiben allerdings bestehen
  und müssten zuerst gelöst werden.
- **Die Trennlinie muss von Hand gehalten werden.** „Der Store hält, `lib/live*`
  entscheidet" ist keine Regel, die der Compiler erzwingt. Eine neue Fachregel direkt im
  Store einzubauen ist jederzeit möglich und fällt niemandem auf – außer beim Lesen.

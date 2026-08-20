# ADR-0019 – Schreibnaht je Bereich, ein Store für zusammengehörige Tabellen

**Status:** akzeptiert
**Datum:** 2026-08-20

## Kontext

Die Schreibpfade der App liefen ursprünglich direkt aus den Mutations-Hooks gegen
Supabase: der Hook kannte die Tabelle, die Feldnamen, die Reihenfolge der Handgriffe und
die Fehlerbehandlung. Das hatte zwei Folgen. Erstens war ein Schreibpfad nur mit einer
echten Datenbank prüfbar – also praktisch gar nicht, und ausgerechnet der heikelste Pfad
der App (eine Sicherung wiederherstellen: erst den kompletten Bestand löschen, dann neu
einfügen) war völlig ungeprüft. Zweitens stand die Prüfung „lief der Schritt durch?"
verstreut bei jedem Aufrufer statt an einer Stelle.

Beim Einziehen einer Naht zwischen Hook und Datenbank stand die Zuschnittsfrage an: eine
Naht **je Tabelle** oder **je fachlichem Bereich**? Je Tabelle ist die sauberere Linie und
braucht keine Ermessensentscheidung. Sie zerreißt aber Schreibvorgänge, die fachlich einer
sind: Der 1RM-Test schreibt in einem Zug den Test und den Übungskatalog, der Journey-Start
friert Referenzgewichte an den Übungen ein.

## Entscheidung

**Je Schreibbereich zwei Bausteine, `src/lib/<bereich>Store.ts` und
`src/lib/<bereich>Write.ts`.**

- Der **Store** ist die unterste Schicht: eine schmale Schnittstelle mit einem Handgriff je
  Methode. Er kennt nur Supabase und die Schema-Typen, niemals die Mutationen oder Hooks
  darüber. Die Fehlerprüfung sitzt hier an genau einer Stelle (`must`).
- Der Store hat **zwei Gesichter**: `supabase<Bereich>Store` im Betrieb und
  `createMemory<Bereich>Store()` für Tests, der protokolliert statt zu schreiben.
- Der **Write-Baustein** hält die reine Abfolge „Absicht → Handgriffe" samt Feld-Abbildung
  und kennt Supabase nicht. Der Hook trägt danach nur noch Absicht und Auffrischung.

**Ein Store darf mehrere Tabellen bedienen, wenn sie fachlich einer sind oder in einem Zug
geschrieben werden.** Die Linie verläuft am Schreibvorgang, nicht an der Tabelle. Nach
dieser Regel sind die bestehenden Zuschnitte entstanden:

- **Messungen und Mess-Meilensteine** in einem Store, weil sie fachlich derselbe Bereich
  sind.
- **Übungskatalog, Übungs-Meilensteine und 1RM-Tests** in einem Store, weil der 1RM-Test in
  einem Zug Test und Katalog schreibt.
- **Journey, Phasen, Workout-Zuordnung, Workout-Vorlagen und die Referenzgewichte an den
  Übungen** in einem Store, weil der Journey-Start Referenzgewichte einfriert und der
  Journey-Wechsel Zuordnungen übernimmt.
- **Ausstattung und Einstellungen** in einem Store, weil beides in derselben Ansicht
  gepflegt wird.
- **Die kurzen Erfassungen am eigenen Verlauf** in einem Store: Körperwerte, das
  Anlegen/Löschen einzelner Einheiten außerhalb des geführten Ablaufs und die manuellen
  Eingriffe in den Skill-Fortschritt. Der geführte Schreibpfad bleibt bewusst getrennt beim
  Verlauf – dieselbe Tabelle, aber ein anderer Vorgang.
- **Das Wiederherstellen einer Sicherung** in einem eigenen Store mit nur drei Handgriffen
  (Tabelle leeren, Zeilen einfügen, Einzelzeile ersetzen). Welche Tabelle in welcher
  Reihenfolge drankommt, entscheidet weiterhin das Bestandsregister, nicht der Store.

**Bei den registrierten (pausierbaren) Mutationen tauscht die Naht ausschließlich den Rumpf
der `mutationFn`.** Mutations-Kennung, Nutzlast-Felder und Registrier-Reihenfolge bleiben
unverändert – sonst überleben offline pausierte Schreibvorgänge keinen App-Neustart
(ADR-0009).

## Konsequenzen

- **Jeder umgestellte Schreibpfad ist ohne echte Datenbank prüfbar**
  (`src/lib/__tests__/<bereich>Write.test.ts`). Damit ist auch das Wiederherstellen einer
  Sicherung erstmals abgesichert.
- **Der Zuschnitt hängt an einer Ermessensfrage.** „Fachlich einer" ist keine scharfe
  Grenze. Zwei Leute können denselben Bereich verschieden schneiden, und der Schnitt ist
  später nur mit einem Umbau zu korrigieren. Der Preis für Schreibvorgänge, die nicht
  zerrissen werden.
- **Manche Stores bedienen viele Tabellen.** Der Journey-Store ist der größte – sechs
  Tabellen –, und er wächst mit jedem Journey-Feature weiter. Ab einer gewissen Größe
  verliert „schmale Schnittstelle" seine Bedeutung.
- **Dieselbe Tabelle kann in zwei Stores auftauchen.** Einheiten werden im geführten Ablauf
  vom Verlauf geschrieben, außerhalb davon von den Erfassungen; Übungen schreibt der
  Katalog, Referenzgewichte daran die Journey. Wer eine Tabelle sucht, findet nicht
  zwangsläufig alle ihre Schreiber an einer Stelle.
- **Der Stand ist nicht vollständig.** Welche Bereiche umgestellt sind, steht als Inventar
  in `docs/Architektur.md`, Abschnitt 4.3. Nicht umgestellte Pfade schreiben weiter direkt
  aus dem Hook.
- **Die Absicherung endet an der Naht.** Geprüft ist die Abfolge „Absicht → Handgriffe",
  nicht, ob der Handgriff in der echten Datenbank das Richtige tut. Ein falscher
  Spaltenname im Store fällt im Test nicht auf.

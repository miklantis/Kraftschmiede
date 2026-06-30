# Architektur-Entscheidungen (ADRs)

Dieser Ordner hält die getroffenen Architektur-Entscheidungen fest – je Entscheidung
eine kleine Datei. Ein ADR (Architecture Decision Record) beantwortet drei Fragen:
welches Problem stand an (Kontext), was wurde gewählt (Entscheidung) und was folgt
daraus (Konsequenzen).

Eine Entscheidung wird nie gelöscht. Wird sie später ersetzt, bleibt das alte ADR
stehen und bekommt den Status „ersetzt durch ADR-XXXX". So bleibt nachvollziehbar,
warum etwas einmal so war.

Jedes ADR folgt demselben Aufbau:

- **Titel und Nummer** (z. B. `0001-offline-first.md`)
- **Status** – akzeptiert / ersetzt durch ADR-XXXX / verworfen
- **Datum**
- **Kontext** – welches Problem stand an
- **Entscheidung** – was wurde gewählt
- **Konsequenzen** – was folgt daraus, auch die unangenehmen Seiten

## Liste

- [ADR-0001 – Offline-first mit Sync](./0001-offline-first.md)
- [ADR-0002 – Definitionen in die Datenbank](./0002-definitionen-in-db.md)
- [ADR-0003 – Skill-Definitionen als Seed, Fortschritt in der DB](./0003-skill-definitionen.md)
- [ADR-0004 – Eine aktive Journey pro Nutzer als DB-Constraint](./0004-eine-aktive-journey.md)
- [ADR-0005 – shadcn/ui als kopierte Mechanik, nicht als Optik](./0005-shadcn-als-mechanik.md)
- [ADR-0006 – shadcn-Komponenten aus dem GitHub-Repo statt CLI](./0006-shadcn-aus-github.md)
- [ADR-0007 – base-Pfad und SPA-Fallback für GitHub Pages](./0007-base-pfad-spa-fallback.md)
- [ADR-0008 – Bewusster Update-Hinweis statt stillem Auto-Update](./0008-bewusster-update-hinweis.md)
- [ADR-0009 – Mutationsreihenfolge vor resumePausedMutations](./0009-mutationsreihenfolge.md)

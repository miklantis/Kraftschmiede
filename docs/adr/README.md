# Architektur-Entscheidungen (ADRs)

Dieser Ordner hält die getroffenen Architektur-Entscheidungen fest – je Entscheidung
eine kleine Datei. Ein ADR (Architecture Decision Record) beantwortet drei Fragen:
welches Problem stand an (Kontext), was wurde gewählt (Entscheidung) und was folgt
daraus (Konsequenzen).

Eine Entscheidung wird nie gelöscht. Wird sie später ersetzt, bleibt das alte ADR
stehen und bekommt den Status „ersetzt durch ADR-XXXX". So bleibt nachvollziehbar,
warum etwas einmal so war. Fällt nur ein Teil einer Entscheidung, steht dort
„teilweise ersetzt durch ADR-XXXX", dazu ein Satz, was fällt und was weiter gilt.

Jedes ADR folgt demselben Aufbau:

- **Titel und Nummer** (z. B. `0001-offline-first.md`)
- **Status** – akzeptiert / ersetzt durch ADR-XXXX / teilweise ersetzt durch ADR-XXXX /
  verworfen
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
- [ADR-0010 – MuscleMap: SVG imperativ einbetten](./0010-musclemap-imperative-svg.md)
- [ADR-0011 – Keine Haptik in der Web-App auf aktuellen iPhones](./0011-keine-haptik-ios.md)
- [ADR-0012 – Update-Übernahme über controllerchange](./0012-update-uebernahme-controllerchange.md)
- [ADR-0013 – Deploy-Concurrency mit cancel-in-progress](./0013-deploy-concurrency.md)
- [ADR-0014 – Journey-Abschluss an der Einheit, freies Training ohne Vorgabe](./0014-journey-abschluss-und-freies-training.md)
  – *teilweise ersetzt durch ADR-0017*
- [ADR-0015 – Progressionsregeln des Coaches, einheitlich über alle Phasen](./0015-coach-progressionsregeln.md)
  – *ersetzt durch ADR-0018*
- [ADR-0017 – Journey-Abschluss über den Kalender](./0017-journey-abschluss-ueber-den-kalender.md)
- [ADR-0018 – Steuerung je Phasentyp: Wochenplan oder Coach](./0018-steuerung-je-phasentyp.md)
  – *Nachtrag 23.08.2026: dritter Weg (Coach plus Lastliste) und Lastliste statt Lastfaktor*
- [ADR-0019 – Schreibnaht je Bereich, ein Store für zusammengehörige Tabellen](./0019-schreibnaht-je-bereich.md)
- [ADR-0020 – Der Live-Store bleibt ein Modul](./0020-live-store-bleibt-ein-modul.md)
- [ADR-0021 – Der Phasentyp hängt per Fremdschlüssel an den Bausteinen](./0021-phasentyp-fremdschluessel.md)
- [ADR-0022 – Eine abgeschlossene Journey ist ein Protokoll, kein Plan](./0022-abgeschlossene-journey-ist-protokoll.md)

## Vergebene und gesperrte Nummern

Eine Nummer wird nie wiederverwendet – auch dann nicht, wenn die Entscheidung
zurückgenommen wurde und die Datei nicht mehr im Ordner liegt. Sie steht weiter in der
Git-Historie, und ein zweites ADR mit derselben Nummer macht jeden Verweis darauf
zweideutig.

- **0011 – doppelt vergeben.** `0011-keine-haptik-ios.md` und
  `0011-messungen-von-hand-statt-import.md` tragen beide dieselbe Nummer. Altlast, bleibt
  so.
- **0016 – gesperrt, nicht neu vergeben.** Vergeben an „Lastrampe der Phase" und mit
  #218/#219 wieder zurückgenommen; die Datei ist gelöscht, steht aber in der Git-Historie.
  Der Nachtrag zu ADR-0018 (#321) bestätigt die Rücknahme: Die Last der Phase steht seither
  als Liste je Woche an der Phase, nicht als interpolierte Rampe.
- **0018 – vergeben** an „Steuerung je Phasentyp" (#232), löst ADR-0015 ab.
- **0019 – vergeben** an „Schreibnaht je Bereich" (#263). Hält die Begründung fest, die
  vorher im Volltext in `Architektur.md` stand.
- **0020 – vergeben** an „Der Live-Store bleibt ein Modul" (#263). Ebenso.
- **0021 – vergeben** an „Der Phasentyp hängt per Fremdschlüssel an den Bausteinen"
  (#341). Revidiert den Abschnitt „Der Fremdschlüssel: bewusst keiner" des
  Bausteine-Konzepts; der übrige Abschnitt 9 gilt weiter.
- **0022 – vergeben** an „Eine abgeschlossene Journey ist ein Protokoll, kein Plan"
  (#387).

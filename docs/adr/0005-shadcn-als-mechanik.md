# ADR-0005 – shadcn/ui als kopierte Mechanik, nicht als Optik

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Interaktive Bausteine wie Dialog, Sheet und Tabelle haben viel unsichtbare Mechanik:
Fokus-Fang, Schließen-Verhalten, Tastaturbedienung, Barrierefreiheit, iOS-Eigenheiten.
Diese Kanten selbst zu bauen, kostet über Monate viel Zeit. Gleichzeitig steht der
globale Look (das „Klar"-Theme) fest und soll nicht von einer Bibliothek diktiert werden.

## Entscheidung

shadcn/ui liefert die Mechanik als eigenen, ins Projekt kopierten Code in
`src/components/ui` – kein mitgeschlepptes Paket. Das Aussehen kommt ausschließlich aus
den eigenen Design-Tokens. shadcn ist farb- und formneutral; die eigenen Tokens
darüberzuziehen ist der vorgesehene Weg.

## Konsequenzen

- Die App erbt erprobte Mechanik, ohne die Optik abzugeben.
- Der Code gehört dem Projekt und kann frei angepasst werden; es gibt keine
  Versionsbindung an ein externes Paket.
- Wie die Komponenten konkret beschafft werden, regelt ADR-0006.

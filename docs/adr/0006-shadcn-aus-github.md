# ADR-0006 – shadcn-Komponenten aus dem GitHub-Repo statt CLI

**Status:** akzeptiert
**Datum:** 2025-01

## Kontext

Der übliche Weg, shadcn-Komponenten zu beschaffen, ist der CLI (`npx shadcn add`). Aus
der Arbeitsumgebung ist `ui.shadcn.com` aber nicht erreichbar, der CLI funktioniert
daher nicht.

## Entscheidung

Komponenten werden direkt aus dem GitHub-Repo `shadcn-ui/ui` geholt (Luma-Style unter
`apps/v4/public/r/styles/radix-luma/`). Slot-Imports werden auf `@radix-ui/react-slot`
angepasst, der Brand-Akzent `#0c9d77` bleibt erhalten.

## Konsequenzen

- Das Ergebnis ist identisch zum CLI, nur der Beschaffungsweg ist ein anderer.
- Bei neuen Komponenten ist dieser manuelle Schritt einzuplanen statt eines
  CLI-Aufrufs.
- Setzt ADR-0005 praktisch um.

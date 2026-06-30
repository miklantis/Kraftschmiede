# ADR-0010 – MuscleMap: SVG imperativ einbetten statt dangerouslySetInnerHTML

**Status:** akzeptiert
**Datum:** 2026-06-26

## Kontext

Die `MuscleMap` (`src/components/ui/muscle-map.tsx`) bettet eine SVG ein und färbt
Regionen danach per Effekt direkt auf dem SVG-Teilbaum. Wurde sie über
`dangerouslySetInnerHTML` eingebettet, fiel die Färbung sporadisch weg – am häufigsten
bei Rückkehr aus einem anderen Browser-Tab.

Eingegrenzte Ursache (isoliert in jsdom/React 19 nachgestellt): React 19 wendet
`dangerouslySetInnerHTML` bei jedem Re-Render erneut an, auch bei byte-gleichem Inhalt,
und setzt den SVG-Teilbaum damit auf den rohen Einbett-Zustand zurück (volle
Master-viewBox, neutrales Grau). Da die Effekt-Abhängigkeiten dabei stabil bleiben, lief
der Anstrich-Effekt nicht erneut. Tab-Rückkehr war nur der häufigste Auslöser des
Re-Renders (Refetch bei Fokus, neue Auth-Session). Ein `visibilitychange`-Listener allein
reicht nicht, weil das zurücksetzende Re-Render nach dem Anstrich kommt und ihn
überschreibt.

## Entscheidung

`dangerouslySetInnerHTML` wird nicht verwendet. Die SVG wird in einem `useLayoutEffect`
einmalig imperativ eingebettet (nur wenn noch kein `<svg>` vorhanden ist), danach läuft
der Anstrich. React verwaltet den Teilbaum so nicht mehr; kein Re-Render kann ihn
zurücksetzen.

## Konsequenzen

- Zuschnitt und Färbung überstehen Re-Renders und Tab-Wechsel.
- Wer an der MuscleMap arbeitet, darf nicht zu `dangerouslySetInnerHTML` zurückkehren.
- Gilt für beide Nutzungen (Körper-Muskelkater, Übungs-Detail Beteiligung).

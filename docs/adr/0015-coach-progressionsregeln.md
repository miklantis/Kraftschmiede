# ADR-0015 – Progressionsregeln des Coaches, einheitlich über alle Phasen

**Status:** akzeptiert
**Datum:** 2026-08-17

## Kontext

Die Regel, wann der Coach das Gewicht anhebt, wurde an einem Tag dreimal geändert
(Issues #168, #170, #172) – zweimal in die falsche Richtung. Ursache war eine Lücke in
`suggestWeight`: Die Doppelprogression griff nur bei Anstrengung **unter** dem Zielscore.
Wer exakt in der Zielanstrengung trainierte, fiel in den Auffangzweig für **verfehlte**
Ziele und bekam das obere Bandende als Wiederholungsziel – der saubere Satz sprang damit
weiter als der zu leichte. Zusätzlich stand die Frage im Raum, ob Hypertrophie- und
Kraftphasen unterschiedliche Progressionsregeln brauchen.

## Entscheidung

**Eine Progressionsregel für alle Phasen.** Der Unterschied steckt nicht in der Regel,
sondern in den Rahmenwerten der Journey: Wiederholungsband, Satzrampe, Lastfaktor. Ein
enges Band (4-6, Maximalkraft) lässt die Last häufig wandern, ein breites (8-12,
Hypertrophie) seltener und gibt der Satzrampe Raum – ohne dass der Coach den Phasen-Fokus
kennen muss.

Die Regeln in `suggestWeight`, in dieser Reihenfolge:

1. **Versagen, reduzierte Last oder deutlich zu hart** (Score über Ziel + 0,5) → Gewicht
   senken oder halten.
2. **Oberes Bandende erreicht, Anstrengung höchstens im Ziel** → Gewicht +Schritt,
   Wiederholungen zurück auf den Bandanfang. Erreicht heißt: mindestens ein Arbeitssatz
   war oben, und kein Satz liegt mehr als die Toleranz darunter (siehe unten).
3. **Bandende noch nicht erreicht, Anstrengung höchstens im Ziel** → eine Wiederholung
   mehr.
4. **Ziel erfüllt, aber härter als vorgesehen** → Gewicht und Wiederholungen halten.
   „Halten" heißt halten, nicht „Repband ausreizen".
5. **Ziel verfehlt** → das obere Bandende bleibt das Wiederholungsziel, also nochmal
   versuchen.

Dazu zwei Prinzipien: **Die Zielanstrengung zählt als erfüllt, nicht als Grenzfall** –
Regel 2 und 3 greifen bei `avgScore <= tScore`, ohne Zusatzbedingung „leichter als
vorgesehen". Und **maßgeblich ist der schwächste Arbeitssatz**, sonst zieht ein starker
erster Satz das Ziel hoch.

**Toleranz für den Wiederholungsabfall über die Sätze.** Der schwächste Satz bleibt
maßgeblich, darf aber unter dem Ziel liegen: `T = 0` bei ein bis zwei Arbeitssätzen,
`T = 1` bei drei bis vier, `T = 2` ab fünf, zusätzlich gedeckelt auf die halbe Bandbreite
(Band 8-12 höchstens 2, Band 4-6 höchstens 1). Die Toleranz gilt an beiden Stellen, an
denen der Coach Wiederholungen prüft – ob das Ziel als erfüllt gilt und ob das Bandende
erreicht ist –, sonst bliebe sie wirkungslos. Toleriert werden ausschließlich
Wiederholungen: Versagen, reduzierte Last und zu hohe Anstrengung bleiben harte
Ausschlüsse, und mindestens ein Arbeitssatz muss sein Ziel bzw. das Bandende voll erreicht
haben.

## Begründung

Regel 2 ist der direkt untersuchte Fall: Kassiano et al. (2026) haben „Last erhöhen, wenn
das Bandende erreicht ist" gegen konstante Last getestet, die progressive Bedingung wuchs
deutlich stärker. Regel 3 verliert dabei nichts – Last- und Wiederholungsprogression sind
gleichwertig (Plotkin et al. 2022). Die Zielanstrengung (Score 3, RIR 2) liegt mitten im
wirksamen Korridor von 0-3 RIR (Robinson et al. 2024); eine Bremse, die Anstrengung
unterhalb des Ziels verlangt, hätte den Coach ausgerechnet beim richtig ausgeführten Satz
angehalten. Phasenspezifische Progressionsregeln braucht es nicht: Periodisierung wirkt in
volumengleichen Programmen nur auf die Maximalkraft, nicht auf die Hypertrophie
(Moesgaard et al. 2022), und dass die Last in der Kraftphase wandern muss, erledigt das
enge Band von selbst (Lastspezifität des 1RM, Schoenfeld et al. 2017).

## Konsequenzen

- Der Coach braucht den Phasen-Fokus (`reentry`, `hypertrophy`, `strength`, `test`) nicht
  zu kennen. `suggestWeight` bekommt weiterhin nur Wiederholungsband, Lastfaktor und das
  Reentry-Flag.
- Der Lastfaktor der Journey (`withRamp`) bleibt die einzige Stelle, an der eine Phase
  einen Vorschlag überstimmt.
- Bekannter Restfall: am Bandende, in Zielanstrengung, Lastfaktor deckelt → das Gewicht
  bewegt sich nicht. Gewollt, dort steuert die Rampe.
- Die Toleranz greift nur im Progressionszweig. Die Haltezweige (härter als vorgesehen,
  Ziel verfehlt) rechnen weiter ohne sie: dort ist Halten die richtige Antwort, und wie
  der Coach auf mehrfach verfehltes Ziel reagiert, wird getrennt entschieden (#175).
- Regel 5 kennt weiterhin keine Rückwärtsregel bei mehrfach verfehltem Ziel (#175).
- Offen und bewusst nicht Teil dieser Entscheidung: ob der Coach-Chip kenntlich macht,
  wann die Phase eine Entscheidung überstimmt hat.

## Quellen

- Kassiano W. et al. (2026): *Progressive Overload Affects the Magnitude of Muscle
  Hypertrophy.* Med Sci Sports Exerc 58(7).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/41718594/)
- Plotkin D. et al. (2022): *Progressive overload without progressing load?* PeerJ
  10:e14142. [PeerJ](https://peerj.com/articles/14142/)
- Robinson Z. P. et al. (2024): *Dose-Response Between Proximity to Failure, Strength
  Gain, and Hypertrophy.* Sports Med 54(9).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/38970765/)
- Moesgaard L. et al. (2022): *Effects of Periodization in Volume-Equated Resistance
  Training Programs.* Sports Med 52(7).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/35044672/)
- Schoenfeld B. J. et al. (2017): *Strength and Hypertrophy Adaptations Between Low- vs.
  High-Load Resistance Training.* JSCR 31(12).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/28834797/)
- *Autoregulated resistance training for maximal strength enhancement.* J Exerc Sci Fit
  (2025). [PubMed](https://pubmed.ncbi.nlm.nih.gov/40791980/)

Zur Toleranz für den Wiederholungsabfall:

- *Relationship between perceptual and mechanical markers of fatigue during bench press
  and bench pull exercises: impact of inter-set rest period length* (2024).
  [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10799610/)
- Refalo M. C. et al. (2023): *Influence of Resistance Training Proximity-to-Failure on
  Neuromuscular Fatigue.* [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9908800/)

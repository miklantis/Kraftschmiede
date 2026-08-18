# ADR-0015 – Progressionsregeln des Coaches, einheitlich über alle Phasen

**Status:** akzeptiert
**Datum:** 2026-08-17
**Nachgezogen:** 2026-08-18 – vier Stellen, die die Lastrampe aus ADR-0016 noch nicht
kannten. Die Entscheidung selbst ist unverändert: es gibt weiterhin eine Progressionsregel
für alle Phasen, und die sechs Regeln unten sind nie angefasst worden.

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
sondern in den Rahmenwerten der Journey: Wiederholungsband, Satzrampe, Lastfaktor und –
seit ADR-0016 – die Lastrampe der Phase. Ein enges Band (4-6, Maximalkraft) lässt die Last
häufig wandern, ein breites (8-12, Hypertrophie) seltener und gibt der Satzrampe Raum –
ohne dass der Coach den Phasen-Fokus kennen muss.

Genau diese Liste war der Anlass für ADR-0016: Zwei der drei ursprünglichen Rahmenwerte
lieferten den Phasenunterschied nicht (die Satzrampe steht in Kraftphasen bewusst still,
der Lastfaktor gehört allein „Wiederaufbau nach Fasten"). Die Lastrampe schließt diese
Lücke – als vierter Rahmenwert, nicht als zweiter Algorithmus.

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
6. **Ziel zweimal in Folge am selben Gewicht verfehlt** → Gewicht einen Schritt zurück,
   Wiederholungsziel bleibt das obere Bandende (Rückwärtsregel, siehe unten).

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

**Rückwärtsregel bei mehrfach verfehltem Ziel (#175).** Regel 5 allein hielt das obere
Bandende beliebig oft als Ziel fest: Wer knapp verfehlt, ohne zu versagen, die Last zu
reduzieren oder über Ziel + 0,5 zu landen, blieb unbegrenzt am selben Gewicht hängen.
Wird das Ziel jetzt **und** in der Einheit davor verfehlt, geht das Gewicht einen Schritt
zurück. Maßgeblich ist dieselbe Ziel-Bewertung wie im Progressionszweig, samt Toleranz für
den Wiederholungsabfall – ein Satz, der nur wegen der Toleranz durchgeht, zählt nicht als
verfehlt. Gezählt wird nur, solange beide Einheiten am selben Gewicht gearbeitet haben:
sobald gesenkt wurde, die Phase die Last verschoben hat oder eine andere Kurzhantel-Stufe
im Spiel war, beginnt die Zählung neu. Damit kann die Regel nicht zweimal hintereinander
greifen und der Coach fällt nicht treppenweise ab. Zwei Einheiten statt drei, weil die
erste verfehlte Einheit bereits einen vollen Wiederholungsversuch am selben Gewicht nach
sich zieht – der Rückschritt kommt also frühestens im dritten Anlauf.

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
  zu kennen. `suggestWeight` bekommt weiterhin nur Wiederholungsband, Reentry-Flag und die
  Vorgabe der Journey. Letztere ist seit ADR-0016 kein blosser Faktor mehr, sondern ein
  Gewicht mit Richtung (`RampLoad`: deckeln oder tragen) – *warum* sie so wirkt, entscheidet
  `rampLoad` in `lib/coach.ts`; die Engine sieht nur die Richtung, nie die Phase.
- Innerhalb der Engine bleibt `withRamp` die einzige Stelle, an der eine Phase einen
  Vorschlag überstimmt. Ausserhalb tut das seit dem 12.08. zusätzlich `phaseEntryOverride`
  in `lib/liveBuild.ts` – erst für den 1RM-Einstieg beim Phasenwechsel, seit ADR-0016 auch
  zum Setzen des Ankers. Dieser Punkt war schon bei Abfassung ungenau formuliert; er meinte
  die Engine, nicht den gesamten Aufbau.
- Bekannter Restfall, **nur noch für den Lastfaktor**: am Bandende, in Zielanstrengung,
  Lastfaktor deckelt → das Gewicht bewegt sich nicht. Bei „Wiederaufbau nach Fasten" ist das
  gewollt, dort steuert die Rampe. Für die Lastrampe der Kraftphasen galt dasselbe zunächst
  auch – bis sich zeigte, dass sie damit den Coach bei erreichtem Ziel ausbremst, obwohl sie
  bei alltäglichen Lasten viel langsamer steigt als er. Seit dem Nachtrag zu ADR-0016 trägt
  sie in den Aufbauwochen nur als Untergrenze; gedeckelt wird dort ausschliesslich in der
  Entlastungswoche.
- Die Toleranz greift nur im Progressionszweig. Die Haltezweige (härter als vorgesehen,
  Ziel verfehlt) rechnen weiter ohne sie: dort ist Halten die richtige Antwort. Für die
  Frage, ob eine frühere Einheit als verfehlt zählt, gilt dagegen die tolerante
  Bewertung – sonst würde eine Einheit, die der Coach damals als erfüllt behandelt hat,
  rückwirkend gegen den Nutzer zählen.
- `suggestWeight` bekommt zusätzlich die Einheit vor der letzten (`prevEntry`). Der
  Verlauf liegt im Client bereits vollständig vor (`useSessionsDetailed`), es braucht
  keinen zusätzlichen Zustand in der Datenbank.
- Die Schrittweite eines Gewichtssprungs kommt aus den Einstellungen (`weight_step`,
  #185) – hoch, runter und beim Wiedereinstieg gleichermaßen. Gerundet
  wird danach weiterhin auf eine ladbare Stufe.


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

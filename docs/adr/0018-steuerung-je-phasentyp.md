# ADR-0018 – Steuerung je Phasentyp: Wochenplan oder Coach

**Status:** akzeptiert
**Datum:** 2026-08-20

## Kontext

ADR-0015 hielt fest, es gebe *eine* Progressionsregel für alle Phasen; der Unterschied
stecke allein in den Rahmenwerten der Journey – Wiederholungsband, Satzrampe, Lastfaktor.
Für Hypertrophie stimmt das weiterhin. Für die Kraftphase nicht: Ein Band von 4–6
Wiederholungen, in dem die Wiederholungen wandern und das Gewicht erst am oberen Bandende
springt, ist Hypertrophie mit weniger Wiederholungen. Eine Maximalkraftphase ist umgekehrt
gebaut – Sätze und Wiederholungen stehen fest, nur die Last wandert. Dafür gibt es einen
Grund: Periodisierung wirkt in volumengleichen Programmen auf die Maximalkraft, nicht auf
die Hypertrophie (Moesgaard et al. 2022), und Kraft ist lastspezifisch – wer schwer werden
will, muss schwer heben (Schoenfeld et al. 2017).

Eine Übung bekommt ihre Vorgaben deshalb auf zwei grundverschiedenen Wegen, je nach Fokus
der laufenden Phase. Quer dazu liegt die Testphase: Sie trägt zwar einen Plan, steigert aber
nichts – sie entlastet und testet dann. Der Abschluss der Journey gehört nicht hierher, den
beschreibt ADR-0017.

## Entscheidung

### Zwei Wege

**Weg 1 – die Phase gibt die Struktur vor** (Fokus `strength`, `power`, `test`). Der
Wochenplan an der Phase setzt Sätze, Wiederholungen und Ziel-Anstrengung. Der Coach
entscheidet nur noch, ob das Gewicht steigt oder stehen bleibt.

**Weg 2 – der Coach steuert frei** (Fokus `hypertrophy`, `endurance`, `reentry`,
`maintenance`). Doppelprogression im Wiederholungsband, Satzrampe über die Phasenwochen,
Entlastungswoche mit gesenktem Volumen. Diese Phasen sind unverändert geblieben; dort ist
das Volumen der Motor.

Beides sind gültige Formen von Mehrbelastung: Ob die Wiederholungen steigen oder die Last,
macht für den Reiz keinen Unterschied (Plotkin et al. 2022). Der Unterschied liegt im Ziel
der Phase, nicht in der Qualität der Regel.

**Entschieden wird das am Fokus der Phase, in `engine/weekPlan.ts` und sonst nirgends.**
`buildWeekPlan` legt beim Seeden fest, welcher Fokus überhaupt einen Plan bekommt
(`WEEK_PLAN_FOCUSES`); `planGovernsLoad` entscheidet beim Lesen in `derivePhaseContext`, ob
der Plan in der laufenden Woche die Last steuert. Ob er eine einzelne Übung steuert,
entscheidet `suggestForExercise` (`lib/coach.ts`) über `planSuggestion`: nur Hauptübungen
mit Profil `strength` (`planGovernsExercise`). Zusatzübungen wie Curl und Pull Over fallen
auf ihr eigenes Band aus dem Übungskatalog zurück, Core und Körpergewicht laufen wie immer
über ihre eigene Fortschreibung (`coreCarry`).

### Die Festlegungen des Wochenplans

- **Liste an der Phase statt Interpolation.** Der Plan steht als jsonb an der Phase
  (`week_plan`): je Woche Sätze, Wiederholungen, Ziel-Anstrengung, Anteil am Arbeitsgewicht
  und ein Wochenziel-Text. Was in einer Woche zu tun ist, ist damit ablesbar statt
  errechnet – und wandert beim Journey-Start ohne eigene Kopierlogik mit der Phase mit. Der
  zurückgenommene Vorläufer (Lastrampe der Phase, #218/#219) interpolierte stattdessen
  Prozentwerte über die Phasenwochen; jede Anzeige musste die Rechnung nachbauen.
- **Fester Schritt aus den Einstellungen statt Prozentrampe.** Steigt das Gewicht, steigt es
  um `weight_step` (Standard 2,5 kg), abgerundet auf eine ladbare Stufe. Dieselbe
  Schrittweite wie überall sonst in der App.
- **Erhöhung an der Leistung, nicht am Kalender.** Gewertet wird die letzte Einheit dieser
  Übung in der Vorwoche: alle Arbeitssätze mit voller Wiederholungszahl, kein reduziertes
  Gewicht, kein Versagen, Durchschnitts-Anstrengung höchstens im Wochenziel (`planWeekMet`
  in `engine/planLoad.ts`) → ein Schritt hoch. Sonst bleibt das Gewicht stehen und die
  Wiederholungszahl sinkt planmäßig weiter. Kam die Übung in der Vorwoche gar nicht dran,
  bleibt es stehen: ohne Beleg keine Erhöhung. Eine Rampe, die am Kalender hängt, verlangt
  irgendwann eine Last, die an dem Tag nicht da ist (Autoregulation, J Exerc Sci Fit 2025).
- **Streng, ohne die Ermüdungstoleranz von Weg 2.** Bei zwei oder drei Ziel-Wiederholungen
  ist eine Wiederholung weniger ein Drittel bis die Hälfte des Satzes – das ist kein
  Ermüdungsrauschen mehr.
- **Ziel-Anstrengung wandert mit der Woche.** RIR 2, in den beiden schwersten Wochen RIR 1
  (Phasen unter vier Wochen nur in der letzten). Ohne diese Anhebung fröre die Rampe ab der
  Mitte der Phase ein: Schwere Sätze sind naturgemäß härter als RIR 2, und der Coach würde
  sie als verfehlt lesen. Beide Werte liegen im wirksamen Korridor von 0–3 RIR (Robinson
  et al. 2024).
- **Anker beim Phaseneintritt.** Beim ersten Mal in der Phase bekommt die Übung ihr
  Startgewicht X aus dem geschätzten 1RM – die Planwiederholungen der ersten Woche plus zwei
  in Reserve (rund 81 %), abgerundet; ohne 1RM das letzte Arbeitsgewicht. Danach ist der
  Anker `reference_weight` samt `reference_phase_id`: Nur ein an die laufende Phase
  gebundener Anker zählt, sonst tritt die Übung gerade ein. Innerhalb einer Woche liegt
  immer dasselbe Gewicht auf der Übung, auch wenn sie zweimal drankommt.
- **Nachziehen nur nach unten.** Der Anker folgt der Vorgabe der Einheit, aber nie höher als
  das tatsächlich Bewegte (`anchorAfterSession`): Eine im Training selbst reduzierte Last
  zieht die Vorgabe der nächsten Woche nach unten, ein guter Tag überholt den Plan nicht.
  Gesenkt wird sonst nie – die Rückwärtsregel von Weg 2 ruht hier.
- **Die Testphase entlastet erst, dann testet sie.** Bauregel: Die letzte Woche einer
  Testphase ist die reine Testwoche und plant nichts, jede Woche davor ist Entlastung mit
  60 % vom Startgewicht X der vorangegangenen Kraftphase (`plan_start_weight`), ohne jede
  Steigerung. In Kraftphasen gibt es deshalb keine eigene Entlastungswoche mehr; eine
  Kraftphase ohne folgende Testphase hat gar keine.

### Was in Weg 2 weiter gilt

Die Doppelprogression bleibt unverändert in `engine/progression.ts` (`suggestWeight`), in
dieser Reihenfolge:

1. **Versagen, reduzierte Last oder deutlich zu hart** (Score über Ziel + 0,5) → senken oder
   halten.
2. **Oberes Bandende erreicht, Anstrengung höchstens im Ziel** → Gewicht + Schritt,
   Wiederholungen zurück auf den Bandanfang (Kassiano et al. 2026).
3. **Bandende noch nicht erreicht, Anstrengung höchstens im Ziel** → eine Wiederholung mehr.
4. **Ziel erfüllt, aber härter als vorgesehen** → halten.
5. **Ziel verfehlt** → das obere Bandende bleibt das Wiederholungsziel.
6. **Ziel zweimal in Folge am selben Gewicht verfehlt** → Gewicht einen Schritt zurück
   (Rückwärtsregel).

Dazu die drei Prinzipien: Die Zielanstrengung zählt als erfüllt, nicht als Grenzfall;
maßgeblich ist der schwächste Arbeitssatz; und der Wiederholungsabfall über die Sätze hat
eine Toleranz (0 bis 2 Wiederholungen nach Satzzahl, gedeckelt auf die halbe Bandbreite).
Herleitung und Belege dazu stehen weiter in ADR-0015. Was daran nicht mehr stimmt, ist
allein sein Anspruch, überall zu gelten.

## Konsequenzen

- **Der Coach kennt jetzt den Phasentyp.** ADR-0015 hielt ausdrücklich das Gegenteil fest,
  und es war ein Vorteil. Die reine Rechnung ist unberührt – `suggestWeight` bekommt
  weiterhin nur Band, Lastfaktor und das Reentry-Flag –, die Verzweigung liegt eine Ebene
  darüber in `suggestForExercise`. Damit hängt das Ergebnis jetzt am Fokus der laufenden
  Phase: Ein falsch gesetzter Fokus (falsch geseedet, falsch migriert) schickt eine Übung
  stumm auf den anderen Weg, und das Ergebnis sieht plausibel aus, nur nicht wie geplant.
- **Es gibt keine gemeinsame Regel mehr.** „Der Coach steigert" ist keine beantwortbare
  Frage mehr; zuerst muss geklärt werden, welcher Weg gemeint ist. Eine Änderung in
  `engine/progression.ts` erreicht die Kraftphase nicht, eine in `engine/planLoad.ts` die
  Hypertrophiephase nicht. Zwei Stellen, die nicht mehr von selbst zusammenlaufen.
- **Ein Fehler im Wochenplan wirkt anders als einer im Coach.** Der Coach rechnet aus dem
  Verlauf – ein falscher Vorschlag ist mit der nächsten sauberen Einheit wieder weg. Der
  Wochenplan liegt als Daten an der Phase: Ein falscher Plan bleibt falsch, bis die Phase
  geändert wird (Migration), und er wirkt sofort auf alle Wochen und alle Hauptübungen. Der
  Plan wird deshalb nur über das Zod-Schema in `engine/weekPlan.ts` gelesen; alles, was
  nicht zur Form passt, gilt als „kein Plan" – dann greift Weg 2 statt einer halben Vorgabe.
- **Die Wiederholungsbänder der Phase verlieren in Weg 1 ihre Wirkung.**
  `rep_target_min`/`rep_target_max` bleiben an der Phase stehen und greifen wieder, sobald
  kein Plan da ist. Eine Kraftphase ohne Plan läuft damit weiter wie vor diesem Vorhaben.
- **Der Lastfaktor der Journey wirkt in Weg 1 nicht.** Die Last kommt aus dem Plan (`anchor`
  plus Schritt, `loadPct`), nicht aus `reference_weight × load_factor`. Heute kombiniert
  keine Vorlage beides – eine Kraftphase mit Lastfaktor ≠ 1 würde ihn stillschweigend
  verlieren.
- **Eine Einheit folgt nicht mehr durchgehend derselben Logik.** In einer Kraftphase steht
  die Hauptübung nach Plan neben dem Curl nach Doppelprogression. Gewollt – bei
  Zusatzübungen ist das Volumen der Motor –, aber erklärungsbedürftig, wenn zwei Übungen
  derselben Einheit unterschiedlich reagieren.
- **Der Plan musste nachgetragen werden.** Weil er als Daten an der Phase liegt, haben
  Vorlagen und laufende Journey ihn per Migration bekommen (`0031`, nachgezogen in `0033`),
  dazu den Phasenbezug des Ankers und das Startgewicht (`0035`). Eine Phase, die dabei
  übersehen wird, fällt still auf Weg 2 zurück.

## Quellen

- Moesgaard L. et al. (2022): *Effects of Periodization in Volume-Equated Resistance
  Training Programs.* Sports Med 52(7).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/35044672/)
- Schoenfeld B. J. et al. (2017): *Strength and Hypertrophy Adaptations Between Low- vs.
  High-Load Resistance Training.* JSCR 31(12).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/28834797/)
- Robinson Z. P. et al. (2024): *Dose-Response Between Proximity to Failure, Strength Gain,
  and Hypertrophy.* Sports Med 54(9).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/38970765/)
- *Autoregulated resistance training for maximal strength enhancement.* J Exerc Sci Fit
  (2025). [PubMed](https://pubmed.ncbi.nlm.nih.gov/40791980/)
- Plotkin D. et al. (2022): *Progressive overload without progressing load?* PeerJ 10:e14142.
  [PeerJ](https://peerj.com/articles/14142/)
- Kassiano W. et al. (2026): *Progressive Overload Affects the Magnitude of Muscle
  Hypertrophy.* Med Sci Sports Exerc 58(7).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/41718594/)

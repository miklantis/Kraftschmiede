# ADR-0015 – Progressionsregeln des Coaches, einheitlich über alle Phasen

**Status:** akzeptiert
**Datum:** 2026-08-17 (Begründung und Quellen überarbeitet 2026-08-17)

## Kontext

Die Regel, wann der Coach das Gewicht anhebt, wurde an einem Tag dreimal geändert
(Issues #168, #170, #172) – zweimal in die falsche Richtung. Ausgelöst hat das ein
Fall aus der Maximalkraft-Phase: Deadlift, vier Arbeitssätze mit 4 Wiederholungen bei
50 kg in Zielanstrengung (Score 3, RIR 2), Wiederholungsband der Phase 4-6. Der Coach
schlug „Halten, 50 kg × 6" vor – ein Sprung von zwei Wiederholungen unter einem Label,
das Stillstand verspricht.

Ursache war eine Lücke in `suggestWeight`: Die Doppelprogression griff nur bei
Anstrengung **unter** dem Zielscore. Wer exakt in der Zielanstrengung trainierte, fiel
in den Auffangzweig, der für **verfehlte** Ziele gebaut ist und das Wiederholungsziel
pauschal auf das obere Bandende setzt. Der saubere Satz sprang damit weiter als der zu
leichte.

Beim Reparieren stand zusätzlich die Frage im Raum, ob Hypertrophie- und Kraftphasen
unterschiedliche Progressionsregeln brauchen: In der Hypertrophie steigert die Journey
das Volumen ohnehin über die Satzrampe (2 → 6 Sätze), in der Maximalkraft über die
Last. Der Gedanke war, die Gewichtssteigerung in der Hypertrophie zu bremsen, damit
Satzzahl und Last nicht in derselben Woche springen.

## Entscheidung

**Eine Progressionsregel für alle Phasen.** Der Unterschied zwischen den Phasen steckt
nicht in der Regel, sondern in den Rahmenwerten, die die Journey ohnehin vorgibt:
Wiederholungsband, Satzrampe und Lastfaktor. Ein enges Band (4-6, Maximalkraft) führt
automatisch dazu, dass die Last häufig wandert; ein breites (8-12, Hypertrophie) lässt
sie seltener wandern und gibt der Satzrampe mehr Raum. Genau der gewünschte Unterschied,
ohne dass der Coach den Phasen-Fokus kennen muss.

Die Regeln in `suggestWeight`, in dieser Reihenfolge:

1. **Versagen, reduzierte Last oder deutlich zu hart** (Score über Ziel + 0,5) → Gewicht
   senken oder halten.
2. **Oberes Bandende in allen Arbeitssätzen erreicht, Anstrengung höchstens im Ziel** →
   Gewicht +Schritt, Wiederholungen zurück auf den Bandanfang.
3. **Bandende noch nicht erreicht, Anstrengung höchstens im Ziel** → eine Wiederholung
   mehr.
4. **Ziel erfüllt, aber härter als vorgesehen** → Gewicht und Wiederholungen halten.
   „Halten" heißt halten, nicht „Repband ausreizen".
5. **Ziel verfehlt** → das obere Bandende bleibt das Wiederholungsziel, also nochmal
   versuchen.

**Die Zielanstrengung zählt als erfüllt, nicht als Grenzfall.** Score gleich Zielscore
ist genau das gewünschte Training und löst den nächsten Schritt aus – Regel 2 und 3
greifen bei `avgScore <= tScore`. Eine Zusatzbedingung „es muss leichter als vorgesehen
gewesen sein" gibt es nicht.

**Maßgeblich ist der schwächste Arbeitssatz.** Sonst zieht ein starker erster Satz das
Ziel hoch, obwohl die späteren schon abgefallen sind.

## Begründung

Die erste Fassung dieses ADR war mit Coaching-Blogs belegt. Die Begründung ist deshalb
gegen die Fachliteratur nachgeprüft und hier neu geschrieben worden. Ergebnis: die
Entscheidung bleibt, sie ist besser belegt als zuvor behauptet, und die Prüfung hat zwei
Lücken aufgedeckt (siehe „Offene Punkte").

**Regel 2 ist der direkt untersuchte Fall.** Kassiano et al. (2026) haben genau diese
Regel gegen ihr Gegenteil getestet: Last erhöhen, sobald das obere Ende des
Wiederholungsbands (8-12) erreicht ist, gegen dieselbe Last über acht Wochen, im
Within-Subject-Design am Arm derselben Person. Die progressive Bedingung wuchs deutlich
stärker. Die Doppelprogression ist damit keine Konvention, sondern die geprüfte Variante.
Nebenbefund für die Reentry-Phase: Untrainierte wachsen auch ohne Progression, nur
langsamer – ein träger Coach schadet Einsteigern also nicht.

**Regel 3 ist echte Progression, kein Aufschub.** Plotkin et al. (2022) haben bei
trainierten Personen Lastprogression gegen Wiederholungsprogression über acht Wochen
verglichen: gleiche Hypertrophie, gleiche Kraftzuwächse. Die Zwischenstufe „erst
Wiederholungen, dann Gewicht" verliert nichts.

**Die Zielanstrengung als Auslöser ist richtig gesetzt.** Die Meta-Regression von
Robinson et al. (2024) zeigt: Hypertrophie steigt, je näher am Versagen trainiert wird,
mit Optimum etwa im Bereich 0-3 RIR; Kraftzuwachs ist gegenüber der Nähe zum Versagen
weitgehend unempfindlich. Zielanstrengung der App (Score 3, RIR 2) liegt mitten in
diesem Korridor. Eine Bremse, die Anstrengung *unterhalb* des Ziels verlangt, hätte den
Coach ausgerechnet beim richtig ausgeführten Satz angehalten. Dass RIR/RPE überhaupt als
Steuergröße taugt, ist eigenständig belegt (JSCR 2022); dass autoregulierte Steuerung
starren Prozentvorgaben für Maximalkraft überlegen ist, zeigt die Netzwerk-Metaanalyse
im Journal of Exercise Science & Fitness (2025).

**Eine Regel für alle Phasen ist gedeckt.** Moesgaard et al. (2022) finden in
volumengleichen Programmen: Periodisierung hilft der Maximalkraft, aber die Hypertrophie
wird von der Periodisierung von Volumen und Intensität nicht beeinflusst; ein Vorteil
undulierender gegenüber linearer Gestaltung zeigt sich nur bei Trainierten und nur beim
1RM. Der Unterschied zwischen Phasen entsteht also über Volumen, Intensität und
Wiederholungsband – genau die Rahmenwerte, die die Journey vorgibt –, nicht über
abweichende Progressionslogiken. Dass die Last in der Kraftphase wirklich wandern muss,
folgt aus der Lastspezifität des 1RM (Schoenfeld et al. 2017: hohe Lasten bringen mehr
1RM-Kraft, Hypertrophie ist über weite Lastbereiche gleich). Das enge Band 4-6 leistet
das automatisch.

**Zur ursprünglichen Phasenfrage.** Die Sorge, in der Hypertrophie dürften Satzzahl und
Last nicht in derselben Woche steigen, findet in der Literatur keine Stütze. Volumen
wirkt dosisabhängig mit abnehmendem Zusatznutzen (Meta-Regressionen zur Volumen-Dosis,
Sports Medicine 2026), und Lastprogression und Wiederholungsprogression sind
gleichwertig (Plotkin et al. 2022) – es gibt keinen Befund, dass beides gleichzeitig
schadet. Auch die Deload-Frage ist offen: Coleman et al. (2024) fanden für eine
Deload-Woche in der Mitte eines Neun-Wochen-Programms keinen Hypertrophie-Vorteil und
leicht schlechtere Kraftwerte. Es gibt also keinen Grund, die Regel vorsorglich zu
bremsen.

**Empirischer Abgleich mit der laufenden Journey.** Deadlift stand in der Hypertrophie
fünf Wochen auf 12×42.5 kg bei Score 3, während die Sätze von 2 auf 5 stiegen – erst
der Phasenwechsel hat die Last bewegt. Nach Regel 2 wäre sie mitgewandert. Vorsicht bei
der Deutung: Dieser Stillstand kann auch die unten beschriebene „alle Arbeitssätze"-Hürde
gewesen sein, nicht nur die alte Lücke. Ein Einzelfall aus einer Journey belegt keine
Regel, er illustriert sie.

## Offene Punkte aus der wissenschaftlichen Prüfung

Zwei Stellen sind durch die Literatur nicht gedeckt und je in einem Issue erfasst. Sie
ändern das Verhalten des Coaches und werden getrennt entschieden, nicht mit diesem ADR:

- **„Oberes Bandende in allen Arbeitssätzen" ist zu streng** (Issue #174). Der Wiederholungsabfall
  über die Sätze ist normale Ermüdung, kein Zeichen zu hoher Last: signifikanter Abfall
  ab dem zweiten Satz bei einer Minute Pause, ab dem dritten noch bei drei bis fünf
  Minuten (Inter-Set-Pausen-Studie 2024). Bei fünf bis sechs Arbeitssätzen erreicht der
  letzte Satz das Bandende praktisch nie, das Gewicht friert dann strukturell ein.
  Gegenläufig gilt aber: die RIR-Einschätzung ist nahe am Versagen am genauesten
  (systematisches Review zur RIR-Genauigkeit), der späte Satz ist also das verlässlichere
  Signal. Lösung ist deshalb nicht „Mittelwert statt Minimum", sondern eine Toleranz –
  etwa der letzte Satz darf eine Wiederholung unter dem Bandende liegen.
- **Regel 5 kennt keinen Ausweg** (Issue #175). Verfehlte Ziele lassen das Bandende als Ziel stehen,
  beliebig oft; gesenkt wird nur bei Versagen oder Score über Ziel + 0,5. Etablierte
  autoregulierte Systeme passen symmetrisch in beide Richtungen an. Ohne Rückwärts-Regel
  kann der Coach über mehrere Sitzungen an einem zu schweren Gewicht festhalten.

Ebenfalls beachten, aber ohne Handlungsbedarf: die RIR-Einschätzung hat eine Lernkurve,
Anfänger unterschätzen systematisch. Für die Reentry-Phase spricht das für konservative
Schritte – das leistet der Lastfaktor bereits.

## Konsequenzen

- Der Coach braucht den Phasen-Fokus (`reentry`, `hypertrophy`, `strength`, `test`)
  nicht zu kennen. `suggestWeight` bekommt weiterhin nur Wiederholungsband, Lastfaktor
  und das Reentry-Flag.
- Der Lastfaktor der Journey (`withRamp`) bleibt die einzige Stelle, an der eine Phase
  einen Vorschlag überstimmt: Er deckelt das Gewicht, solange die Journey unter dem
  Referenzniveau rampt.
- Bekannter Restfall: Steht eine Übung am Bandende, ist in Zielanstrengung, und der
  Lastfaktor deckelt, bewegt sich das Gewicht nicht. Das ist gewollt – die Rampe der
  Journey steuert dort, nicht die Tagesform.
- Offen und bewusst nicht Teil dieser Entscheidung: ob der Coach-Chip in der Oberfläche
  kenntlich machen soll, wann die Phase eine Entscheidung überstimmt hat.

## Quellen

Peer-reviewte Arbeiten, nach Regel geordnet. Die Coaching-Blogs der ersten Fassung sind
entfallen – sie stimmten inhaltlich, trugen als Beleg aber nicht.

Doppelprogression und Progressionsart (Regeln 2 und 3):

- Kassiano W. et al. (2026): *Progressive Overload Affects the Magnitude of Muscle
  Hypertrophy.* Medicine & Science in Sports & Exercise 58(7), 1556-1565.
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/41718594/)
- Plotkin D. et al. (2022): *Progressive overload without progressing load? The effects
  of load or repetition progression on muscular adaptations.* PeerJ 10:e14142.
  [PeerJ](https://peerj.com/articles/14142/)
- Schoenfeld B. J. et al. (2017): *Strength and Hypertrophy Adaptations Between Low- vs.
  High-Load Resistance Training: A Systematic Review and Meta-analysis.* Journal of
  Strength and Conditioning Research 31(12), 3508-3523.
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/28834797/)

Anstrengung als Auslöser (Zielanstrengung, Regel 1 und 4):

- Robinson Z. P. et al. (2024): *Exploring the Dose-Response Relationship Between
  Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle
  Hypertrophy: A Series of Meta-Regressions.* Sports Medicine 54(9), 2209-2231.
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/38970765/)
- *Repetitions in Reserve Is a Reliable Tool for Prescribing Resistance Training Load.*
  Journal of Strength and Conditioning Research (2022).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/36135029/)
- *Autoregulated resistance training for maximal strength enhancement: A systematic
  review and network meta-analysis.* Journal of Exercise Science & Fitness (2025).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/40791980/)
- *Factors influencing the accuracy of the repetition in reserve scale in resistance
  training: a systematic review.*
  [Forschungsportal](https://researchportal.ulisboa.pt/en/publications/factors-influencing-the-accuracy-of-the-repetition-in-reserve-sca/)

Eine Regel für alle Phasen, Volumen und Ermüdung:

- Moesgaard L., Beck M. M., Christiansen L., Aagaard P., Lundbye-Jensen J. (2022):
  *Effects of Periodization on Strength and Muscle Hypertrophy in Volume-Equated
  Resistance Training Programs: A Systematic Review and Meta-analysis.* Sports Medicine
  52(7), 1647-1666. [PubMed](https://pubmed.ncbi.nlm.nih.gov/35044672/)
- *The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of
  Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gains.* Sports Medicine
  (2026). [PubMed](https://pubmed.ncbi.nlm.nih.gov/41343037/)
- Coleman M. et al. (2024): *Gaining more from doing less? The effects of a one-week
  deload period during supervised resistance training on muscular adaptations.* PeerJ
  12:e16777. [PeerJ](https://peerj.com/articles/16777/)

Satz-für-Satz-Abfall (offener Punkt „alle Arbeitssätze"):

- Refalo M. C. et al. (2023): *Influence of Resistance Training Proximity-to-Failure,
  Determined by Repetitions-in-Reserve, on Neuromuscular Fatigue in Resistance-Trained
  Males and Females.*
  [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9908800/)
- *Relationship between perceptual and mechanical markers of fatigue during bench press
  and bench pull exercises: impact of inter-set rest period length* (2024).
  [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10799610/)

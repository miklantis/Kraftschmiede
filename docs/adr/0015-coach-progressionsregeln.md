# ADR-0015 – Progressionsregeln des Coaches, einheitlich über alle Phasen

**Status:** akzeptiert
**Datum:** 2026-08-17

## Kontext

Die Regel, wann der Coach das Gewicht anhebt, wurde an einem Tag dreimal geändert
(Issues #168, #170, #172) – zweimal in die falsche Richtung. Ausgelöst hat das ein
Fall aus der Maximalkraft-Phase: Deadlift, vier Arbeitssätze mit 4 Wiederholungen bei
50 kg in Zielanstrengung (Score 3, RIR 2), Wiederholungsband der Phase 4-6. Der Coach
schlug „Halten, 50 kg × 6“ vor – ein Sprung von zwei Wiederholungen unter einem Label,
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

Eine Recherche zur gängigen Trainingslehre hat das widerlegt.

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
   „Halten“ heißt halten, nicht „Repband ausreizen“.
5. **Ziel verfehlt** → das obere Bandende bleibt das Wiederholungsziel, also nochmal
   versuchen.

**Die Zielanstrengung zählt als erfüllt, nicht als Grenzfall.** Score gleich Zielscore
ist genau das gewünschte Training und löst den nächsten Schritt aus – Regel 2 und 3
greifen bei `avgScore <= tScore`. Eine Zusatzbedingung „es muss leichter als vorgesehen
gewesen sein“ gibt es nicht.

**Maßgeblich ist der schwächste Arbeitssatz.** Sonst zieht ein starker erster Satz das
Ziel hoch, obwohl die späteren schon abgefallen sind.

## Begründung

Die Standardform der Doppelprogression lautet: Erreicht man das obere Ende des
Wiederholungsbands in allen Arbeitssätzen, steigt das Gewicht und die Wiederholungen
gehen zurück auf den Bandanfang. In diesen Systemen wird durchgehend nahe am Limit
trainiert – RPE 8-9 bzw. RIR 1-2, also genau die Zielanstrengung dieser App. Das
Bandende wird normalerweise **in** der Zielanstrengung erreicht, nicht darunter. Eine
Bremse, die Anstrengung unterhalb des Ziels verlangt, hält den Coach also ausgerechnet
dann an, wenn richtig trainiert wurde.

Zur Phasenfrage: In einem Hypertrophie-Mesozyklus führt tatsächlich das Volumen (Start
nahe MEV, Sätze steigen wöchentlich Richtung MRV, dann Deload). Die Last friert dabei
aber nicht ein, sie wandert nebenher mit – „volume-first“, nicht „volume-only“. Ein
Kraft-Block dreht die Gewichtung um: höhere Intensität, engere Wiederholungsbänder,
weniger Volumen. Beides bildet die Journey über ihre Rahmenwerte bereits ab.

Belegt an den Echtdaten der laufenden Journey: Deadlift stand in der Hypertrophie fünf
Wochen auf 12×42.5 kg bei Score 3, während die Sätze von 2 auf 5 stiegen. Das Volumen
wuchs also, die Last stand – erst der Phasenwechsel hat sie bewegt. Nach obiger Regel 2
wäre sie mitgewandert.

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

- [Legion Athletics – The Double Progression Method](https://legionathletics.com/double-progression/)
- [Mesostrength – Double Progression: The Simplest Overload Method Explained](https://mesostrength.com/blog/double-progression)
- [Seannal – Dynamic Double Progression](https://www.seannal.com/articles/training/general/dynamic-double-progression.php)
- [RP Strength – In Defense of Set Increases Within the Hypertrophy Mesocycle](https://rpstrength.com/blogs/articles/in-defense-of-set-increases-within-the-hypertrophy-mesocycle)
- [Biolayne – Mixed vs Block Periodization for Hypertrophy and Strength](https://biolayne.com/reps/issue-10/mixed-vs-block-periodization-for-hypertrophy-and-strength/)
- [BarBend – 3 Types of Training Periodization](https://barbend.com/different-types-of-training-periodization/)

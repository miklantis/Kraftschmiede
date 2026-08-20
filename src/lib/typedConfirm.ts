// Zeichengenauer Textvergleich fuer die Bestaetigung durch Abtippen (Baustein
// TypeToConfirm, siehe components/ui/type-to-confirm.tsx).
//
// Bewusst ohne Trimmen, ohne Kleinschreibung und ohne Unicode-Normalisierung:
// die Huerde ist die Absicht, nicht die Bequemlichkeit. Wer "ubung" statt
// "Übung" tippt oder ein Leerzeichen anhaengt, hat nicht abgetippt - und
// genau dieses Stolpern soll den versehentlichen Griff abfangen.
//
// Ein leeres Wort passt nie: sonst waere der Knopf offen, bevor ueberhaupt
// etwas zu bestaetigen ist.
export function typedConfirmMatches(typed: string, word: string): boolean {
  if (word === "") return false;
  return typed === word;
}

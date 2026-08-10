// Hinweis der Journey zur vorgegebenen Last ("Wiederaufbau nach Fasten"): steht
// im Start-Popup ueber den Satz-Karten und im laufenden Panel ganz oben, damit
// ein bewusst niedriger Vorschlag nicht wie ein Fehler des Coachs wirkt. Text
// kommt fertig aus dem Phasen-Kontext (lib/loadFactor).
export function LoadNoteBanner({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={
        "rounded-[14px] border border-primary/30 bg-primary/10 px-4 py-3 text-[14px] font-medium leading-snug text-foreground " +
        className
      }
    >
      {text}
    </div>
  );
}

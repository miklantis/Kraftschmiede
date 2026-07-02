// Zwei eigene Trainingstyp-Symbole im Lucide-Stil (24er-Raster, currentColor,
// stroke-width 2). Sie werden als fuehrendes Symbol in Listenzeilen genutzt
// (Workouts, Yoga); fuer Skills dient das vorhandene Lucide-Symbol "Zap".
// Groesse und Farbe steuert der Aufrufer ueber className.

interface IconProps {
  readonly className?: string;
}

// Workout (Kraft): Stoppuhr.
export function WorkoutIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 2H14" />
      <path d="M12 14L15 11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}

// Yoga: sitzende Figur (Kopf/Oberkoerper ueber gekreuzten Beinen).
export function YogaIcon({ className }: IconProps): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3.5C10.3 6 9.4 8.2 9.4 10.2A2.6 2.6 0 0 0 14.6 10.2C14.6 8.2 13.7 6 12 3.5Z" />
      <path d="M4.5 14.5C7 17.8 17 17.8 19.5 14.5" />
    </svg>
  );
}

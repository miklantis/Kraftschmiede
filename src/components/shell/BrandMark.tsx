// Markenzeichen aus V1 uebernommen (gleiche Geometrie), als Komponente fuer
// Sidebar und Mobile-Kopf. Faerbung folgt currentColor, Groesse per Prop.
export function BrandMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(2,2)">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.2"
          d="M3.629 6.685c-0.254 0.193 -0.56 0.303 -0.879 0.315A2.05 2.05 0 0 1 0.5 5a2.05 2.05 0 0 1 2.25 -2C3.993 3 5 5 5 5s1.007 2 2.25 2A2.05 2.05 0 0 0 9.5 5a2.05 2.05 0 0 0 -2.25 -2 1.548 1.548 0 0 0 -0.879 0.315"
        />
      </g>
    </svg>
  );
}

/**
 * Logo used in the Checkout footer ("Powered by Blyss").
 *
 * Renders the wordmark + signature dot in `currentColor` so it picks up the
 * surrounding text color (white on the dark checkout footer, dark on light).
 */
const PolarLogo = ({
  className,
  width,
  height,
}: {
  className?: string;
  width?: number;
  height?: number;
}) => {
  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={width}
      height={height}
      role="img"
      aria-label="Blyss"
    >
      <text
        x="0"
        y="22"
        fontFamily="'Inter Display', 'Inter', system-ui, -apple-system, sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="-0.65"
        fill="currentColor"
      >
        Blyss
      </text>
      <circle cx="50" cy="28" r="1.4" fill="var(--accent)" />
    </svg>
  );
};

export default PolarLogo;

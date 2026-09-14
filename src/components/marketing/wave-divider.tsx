export function WaveDivider() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className="h-24 w-full"
    >
      <defs>
        <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--chart-2)" />
          <stop offset="50%" stopColor="var(--chart-1)" />
          <stop offset="100%" stopColor="var(--chart-3)" />
        </linearGradient>
      </defs>
      <path
        d="M0,60 C150,110 350,10 600,60 C850,110 1050,10 1200,60"
        fill="none"
        stroke="url(#wave-gradient)"
        strokeWidth="2"
        opacity="0.7"
      />
    </svg>
  );
}

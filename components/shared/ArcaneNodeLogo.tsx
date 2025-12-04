interface ArcaneNodeLogoProps {
  size?: number;
  withGlow?: boolean;
}

export function ArcaneNodeLogo({ size = 32, withGlow = true }: ArcaneNodeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={withGlow ? 'glow-teal' : ''}
    >
      <g opacity="0.9">
        <path
          d="M24 4L28 12L36 8L32 16L40 20L32 24L36 32L28 28L24 36L20 28L12 32L16 24L8 20L16 16L12 8L20 12L24 4Z"
          stroke="#3BE3D5"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        <circle cx="24" cy="8" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="32" cy="12" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="36" cy="20" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="32" cy="28" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="24" cy="32" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="16" cy="28" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="12" cy="20" r="2" fill="#3BE3D5" opacity="0.8" />
        <circle cx="16" cy="12" r="2" fill="#3BE3D5" opacity="0.8" />

        <path
          d="M24 16L28 20L24 24L20 20L24 16Z"
          fill="#3BE3D5"
          opacity="0.4"
        />

        <path
          d="M24 8L32 12M32 12L36 20M36 20L32 28M32 28L24 32M24 32L16 28M16 28L12 20M12 20L16 12M16 12L24 8"
          stroke="#4CA4FF"
          strokeWidth="0.5"
          opacity="0.6"
        />

        <circle cx="24" cy="20" r="8" stroke="#3BE3D5" strokeWidth="1" opacity="0.3" fill="none" />
      </g>
    </svg>
  );
}

import { ArcaneNodeLogo } from './ArcaneNodeLogo';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withTagline?: boolean;
  variant?: 'horizontal' | 'stacked';
}

const sizeMap = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
};

export function Logo({ size = 'md', withTagline = false, variant = 'horizontal' }: LogoProps) {
  const { icon, text } = sizeMap[size];

  if (variant === 'stacked') {
    return (
      <div className="flex flex-col items-center gap-4">
        <ArcaneNodeLogo size={icon} withGlow />
        <div className="flex flex-col items-center">
          <div className={`${text} text-silver flex items-baseline gap-1`}>
            <span className="logo-wordmark-campaign">Campaign</span>
            <span className="logo-wordmark-ally">Ally</span>
          </div>
          {withTagline && (
            <p className="tagline text-sm mt-2">
              Every great DM deserves an ally.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <ArcaneNodeLogo size={icon} withGlow />
        <div className={`${text} text-silver flex items-baseline gap-1`}>
          <span className="logo-wordmark-campaign">Campaign</span>
          <span className="logo-wordmark-ally">Ally</span>
        </div>
      </div>
      {withTagline && (
        <p className="tagline text-xs text-center">
          Every great DM deserves an ally.
        </p>
      )}
    </div>
  );
}

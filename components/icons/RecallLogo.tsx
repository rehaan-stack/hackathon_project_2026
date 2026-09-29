import React, { useId } from 'react';

type RecallLogoProps = {
  className?: string;
  label?: string;
  priority?: boolean;
};

/** The RECALL memory-cube identity adapted from the supplied animated logo. */
export function RecallLogo({
  className = 'h-10 w-10',
  label = 'RECALL',
  priority = false,
}: RecallLogoProps) {
  const id = useId().replace(/:/g, '');
  const orbitGradient = `recall-orbit-${id}`;
  const beamGradient = `recall-beam-${id}`;
  const haloGradient = `recall-halo-${id}`;
  const orbitPathOne = `recall-orbit-path-one-${id}`;
  const orbitPathTwo = `recall-orbit-path-two-${id}`;

  return (
    <svg
      viewBox="0 0 160 170"
      className={`recall-logo-mark ${priority ? 'recall-logo-priority' : ''} ${className}`}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={orbitGradient} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff2d55" />
          <stop offset="1" stopColor="#ff7a1a" />
        </linearGradient>
        <linearGradient id={beamGradient} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff2d55" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ff2d55" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={haloGradient}>
          <stop offset="0" stopColor="#ff2d55" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff2d55" stopOpacity="0" />
        </radialGradient>
      </defs>

      <polygon className="recall-logo-beam" points="58,150 102,150 122,96 38,96" fill={`url(#${beamGradient})`} />
      <g className="recall-logo-base" fill="none" stroke="#ff2d55">
        <ellipse cx="80" cy="150" rx="46" ry="10" strokeOpacity="0.8" strokeWidth="1.6" />
        <ellipse cx="80" cy="150" rx="30" ry="6.5" strokeOpacity="0.5" />
        <ellipse cx="80" cy="150" rx="14" ry="3" fill="#ff2d55" fillOpacity="0.5" stroke="none" />
      </g>

      <g className="recall-logo-float">
        <g transform="translate(80 76)" fill="none" stroke={`url(#${orbitGradient})`} strokeWidth="1.6">
          <ellipse className="recall-logo-orbit recall-logo-orbit-one" pathLength="100" rx="66" ry="21" transform="rotate(-30)" />
          <ellipse className="recall-logo-orbit recall-logo-orbit-two" pathLength="100" rx="66" ry="21" transform="rotate(30)" strokeOpacity="0.7" />
        </g>
        <g transform="translate(80 76) rotate(-30)">
          <path id={orbitPathOne} d="M-66 0A66 21 0 1 0 66 0A66 21 0 1 0 -66 0Z" fill="none" stroke="none" />
          <circle className="recall-logo-satellite recall-logo-satellite-green" r="4.4" fill="#16e39a">
            <animateMotion dur="5s" begin="1.8s" repeatCount="indefinite">
              <mpath href={`#${orbitPathOne}`} />
            </animateMotion>
          </circle>
        </g>
        <g transform="translate(80 76) rotate(30)">
          <path id={orbitPathTwo} d="M-66 0A66 21 0 1 1 66 0A66 21 0 1 1 -66 0Z" fill="none" stroke="none" />
          <circle className="recall-logo-satellite recall-logo-satellite-orange" r="3.2" fill="#ff7a1a">
            <animateMotion dur="7s" begin="2s" repeatCount="indefinite">
              <mpath href={`#${orbitPathTwo}`} />
            </animateMotion>
          </circle>
        </g>

        <polygon className="recall-logo-face recall-logo-face-top" points="80,32 118.1,54 80,76 41.9,54" fill="#ff2d55" fillOpacity="0.7" />
        <polygon className="recall-logo-face recall-logo-face-left" points="41.9,54 80,76 80,120 41.9,98" fill="#ff2d55" fillOpacity="0.3" />
        <polygon className="recall-logo-face recall-logo-face-right" points="118.1,54 118.1,98 80,120 80,76" fill="#ff2d55" fillOpacity="0.5" />
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <polygon className="recall-logo-edge recall-logo-edge-one" pathLength="100" points="80,32 118.1,54 118.1,98 80,120 41.9,98 41.9,54" strokeWidth="2.6" />
          <path className="recall-logo-edge recall-logo-edge-two" pathLength="100" d="M80 76V120" strokeWidth="2" />
          <path className="recall-logo-edge recall-logo-edge-three" pathLength="100" d="M80 76L41.9 54" strokeWidth="2" />
          <path className="recall-logo-edge recall-logo-edge-four" pathLength="100" d="M80 76L118.1 54" strokeWidth="2" />
        </g>
        <circle className="recall-logo-halo" cx="80" cy="76" r="15" fill={`url(#${haloGradient})`} />
        <circle className="recall-logo-shock" cx="80" cy="76" r="5" />
        <circle className="recall-logo-core" cx="80" cy="76" r="5.5" fill="#fff" />
      </g>
    </svg>
  );
}

export function RecallWordmark({ className = '' }: { className?: string }) {
  return <span className={`recall-wordmark ${className}`}>RECΛLL</span>;
}

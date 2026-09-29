'use client';

import React from 'react';

/**
 * NeuralCoreIcon - High-tech, futuristic Cybernetic AI Neural Core
 * Featuring quantum neural pathways, glowing synaptic nodes, and central incident processor
 */
export function NeuralCoreIcon({ className = 'w-16 h-16 text-white' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Central Quantum Core Diamond */}
      <polygon
        points="50,34 62,50 50,66 38,50"
        fill="currentColor"
        className="opacity-95"
      />
      <circle cx="50" cy="50" r="4" fill="#ffffff" />

      {/* Vertical Spine / Energy Channel */}
      <line x1="50" y1="18" x2="50" y2="34" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="66" x2="50" y2="82" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

      {/* Top and Bottom Anchor Nodes */}
      <circle cx="50" cy="16" r="3.5" fill="currentColor" />
      <circle cx="50" cy="84" r="3.5" fill="currentColor" />

      {/* Left Hemisphere - High Tech Synaptic Lobe */}
      <path
        d="M 44,22 C 30,20 18,30 20,44 C 16,50 17,62 25,68 C 22,76 32,82 44,78"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Inner Neural Bridge */}
      <path
        d="M 38,50 C 30,50 25,44 26,38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 38,50 C 30,54 26,62 32,68"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="26" cy="38" r="2.5" fill="currentColor" />
      <circle cx="32" cy="68" r="2.5" fill="currentColor" />
      <circle cx="20" cy="50" r="2.5" fill="currentColor" />

      {/* Right Hemisphere - High Tech Synaptic Lobe (Symmetrical) */}
      <path
        d="M 56,22 C 70,20 82,30 80,44 C 84,50 83,62 75,68 C 78,76 68,82 56,78"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right Inner Neural Bridge */}
      <path
        d="M 62,50 C 70,50 75,44 74,38"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 62,50 C 70,54 74,62 68,68"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="74" cy="38" r="2.5" fill="currentColor" />
      <circle cx="68" cy="68" r="2.5" fill="currentColor" />
      <circle cx="80" cy="50" r="2.5" fill="currentColor" />

      {/* Radiant Synaptic Emitting Arcs */}
      <path
        d="M 36,32 C 40,28 46,26 50,26 C 54,26 60,28 64,32"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <path
        d="M 36,68 C 40,72 46,74 50,74 C 54,74 60,72 64,68"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
    </svg>
  );
}

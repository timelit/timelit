import React from 'react';

export default function TimelitLogo({ size = 180, className = "" }) {
  const scale = size / 180;
  
  return (
    <svg 
      viewBox="0 0 180 180" 
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      style={{
        borderRadius: `${size * 0.22}px`,
        background: '#1a1a1a',
      }}
    >
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00D9FF" />
          <stop offset="50%" stopColor="#7B3FF2" />
          <stop offset="100%" stopColor="#E645FF" />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Bar 1 - Shortest, top-left */}
      <rect 
        x="30" 
        y="35" 
        width="50" 
        height="12" 
        rx="6"
        fill="url(#barGradient)"
        filter="url(#glow)"
      />

      {/* Bar 2 - Second shortest */}
      <rect 
        x="40" 
        y="60" 
        width="85" 
        height="12" 
        rx="6"
        fill="url(#barGradient)"
        filter="url(#glow)"
      />

      {/* Bar 3 - Medium */}
      <rect 
        x="50" 
        y="85" 
        width="95" 
        height="12" 
        rx="6"
        fill="url(#barGradient)"
        filter="url(#glow)"
      />

      {/* Bar 4 - Second longest */}
      <rect 
        x="60" 
        y="110" 
        width="90" 
        height="12" 
        rx="6"
        fill="url(#barGradient)"
        filter="url(#glow)"
      />

      {/* Bar 5 - Shortest, bottom-right */}
      <rect 
        x="100" 
        y="135" 
        width="50" 
        height="12" 
        rx="6"
        fill="url(#barGradient)"
        filter="url(#glow)"
      />
    </svg>
  );
}
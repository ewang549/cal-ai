"use client";

import { ReactLenis } from "lenis/react";

/**
 * Smooth-scroll provider. Wraps the whole tree so scroll-linked animations
 * (path drawing, character spread) feel buttery instead of jittery.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        duration: 1.2,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}

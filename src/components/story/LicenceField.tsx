"use client";

import { Canvas } from "@react-three/fiber";
import { LicenceFieldScene } from "./LicenceFieldScene";
import { useReducedMotion, useLowPowerDevice } from "@/hooks/useReducedMotion";

export function LicenceField({
  townCounts,
  className,
  interactive = false,
}: {
  townCounts: Record<string, number>;
  className?: string;
  /** Homepage use is a decorative background (pointer-events-none, aria-hidden) - the
   *  /map page is the actual data explorer: real click/drag/zoom, real navigation on
   *  click, and it's the page's primary content, not decoration for a screen reader. */
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  const lowPower = useLowPowerDevice();

  return (
    <div
      className={`${interactive ? "" : "pointer-events-none"} ${className ?? ""}`}
      aria-hidden={interactive ? undefined : true}
      role={interactive ? undefined : "presentation"}
    >
      <Canvas
        dpr={lowPower ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 40 }}
        gl={{ antialias: !lowPower, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <LicenceFieldScene townCounts={townCounts} autoRotate={!lowPower && !interactive} reduced={reduced} interactive={interactive} />
      </Canvas>
    </div>
  );
}

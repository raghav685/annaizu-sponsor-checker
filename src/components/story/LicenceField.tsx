"use client";

import { Canvas } from "@react-three/fiber";
import { LicenceFieldScene } from "./LicenceFieldScene";
import { useReducedMotion, useLowPowerDevice } from "@/hooks/useReducedMotion";

export function LicenceField({
  townCounts,
  className,
}: {
  townCounts: Record<string, number>;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const lowPower = useLowPowerDevice();

  return (
    <div className={`pointer-events-none ${className ?? ""}`} aria-hidden role="presentation">
      <Canvas
        dpr={lowPower ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 9], fov: 40 }}
        gl={{ antialias: !lowPower, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <LicenceFieldScene townCounts={townCounts} autoRotate={!lowPower} reduced={reduced} />
      </Canvas>
    </div>
  );
}

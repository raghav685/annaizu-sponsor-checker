"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExplorerStore } from "@/lib/store";
import { useReducedMotion, useLowPowerDevice } from "@/hooks/useReducedMotion";

function Field({ count, reduced }: { count: number; reduced: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const targetIntensity = useRef(1);

  const resultCount = useExplorerStore((s) => s.result.ids.length);
  const totalCount = useExplorerStore((s) => s.globalStats?.totalSponsors ?? 1);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    targetIntensity.current = 0.5 + 0.5 * (resultCount / Math.max(1, totalCount));
    if (materialRef.current) {
      materialRef.current.opacity += (targetIntensity.current * 0.5 - materialRef.current.opacity) * 0.05;
    }
    if (pointsRef.current && !reduced) {
      pointsRef.current.rotation.y += delta * 0.008;
      pointsRef.current.rotation.x += delta * 0.003;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#4fe8c9"
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function ParticleField() {
  const reduced = useReducedMotion();
  const lowPower = useLowPowerDevice();
  const count = lowPower ? 4000 : 18000;

  return (
    <div className="pointer-events-none fixed inset-0 z-particles" aria-hidden role="presentation">
      <Canvas
        dpr={lowPower ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ antialias: false, alpha: true }}
        frameloop={reduced ? "demand" : "always"}
      >
        <Field count={count} reduced={reduced} />
      </Canvas>
    </div>
  );
}

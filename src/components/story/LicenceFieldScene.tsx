"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { TOWN_COORDS, projectUk } from "@/lib/townCoordinates";
import { GB_OUTLINE, NI_OUTLINE } from "@/lib/ukOutline";

const SCALE = 5.5;

function outlinePoints(outline: Array<[number, number]>): [number, number, number][] {
  return outline.map(([lat, lon]) => {
    const [x, y] = projectUk(lat, lon);
    return [x * SCALE, y * SCALE, 0];
  });
}

interface TownDatum {
  name: string;
  x: number;
  y: number;
  targetScale: number;
}

function Node({ datum }: { datum: TownDatum }) {
  const ref = useRef<THREE.Group>(null);
  const current = useRef(0.001);

  useFrame(() => {
    current.current += (datum.targetScale - current.current) * 0.08;
    if (ref.current) ref.current.scale.setScalar(current.current);
  });

  return (
    <group ref={ref} position={[datum.x, datum.y, 0]}>
      <mesh>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color="#4fe8c9" toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#4fe8c9" transparent opacity={0.18} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function LicenceFieldScene({
  townCounts,
  autoRotate,
  reduced,
}: {
  townCounts: Record<string, number>;
  autoRotate: boolean;
  reduced: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const nodes: TownDatum[] = useMemo(() => {
    const maxCount = Math.max(1, ...Object.values(townCounts));
    const out: TownDatum[] = [];
    for (const [name, [lat, lon]] of Object.entries(TOWN_COORDS)) {
      const count = townCounts[name] ?? 0;
      const [x, y] = projectUk(lat, lon);
      const targetScale = count > 0 ? 0.4 + 2.6 * Math.sqrt(count / maxCount) : 0.001;
      out.push({ name, x: x * SCALE, y: y * SCALE, targetScale });
    }
    return out;
  }, [townCounts]);

  const gbLine = useMemo(() => outlinePoints(GB_OUTLINE), []);
  const niLine = useMemo(() => outlinePoints(NI_OUTLINE), []);

  useFrame((_, delta) => {
    if (autoRotate && !reduced && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06;
    }
  });

  return (
    <group ref={groupRef} rotation={[0.15, 0, 0]}>
      <Line points={gbLine} color="#4fe8c9" lineWidth={1.2} transparent opacity={0.45} />
      <Line points={niLine} color="#4fe8c9" lineWidth={1.2} transparent opacity={0.45} />
      {nodes.map((n) => (
        <Node key={n.name} datum={n} />
      ))}
    </group>
  );
}

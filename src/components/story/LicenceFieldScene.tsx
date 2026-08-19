"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
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
  count: number;
  targetScale: number;
}

function Node({ datum }: { datum: TownDatum }) {
  const ref = useRef<THREE.Group>(null);
  const current = useRef(0.001);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    const target = hovered ? datum.targetScale * 1.35 : datum.targetScale;
    current.current += (target - current.current) * 0.15;
    if (ref.current) ref.current.scale.setScalar(current.current);
  });

  if (datum.count === 0) return null;

  return (
    <group ref={ref} position={[datum.x, datum.y, 0]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshBasicMaterial color={hovered ? "#e8edf4" : "#4fe8c9"} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#4fe8c9" transparent opacity={hovered ? 0.32 : 0.18} toneMapped={false} depthWrite={false} />
      </mesh>
      {hovered && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-md border border-white/10 bg-void/95 px-2.5 py-1.5 font-mono text-[11px] text-mist shadow-lg">
            <span className="text-mist">{datum.name}</span>{" "}
            <span className="text-signal">{datum.count.toLocaleString()}</span>
          </div>
        </Html>
      )}
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
      out.push({ name, x: x * SCALE, y: y * SCALE, count, targetScale });
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

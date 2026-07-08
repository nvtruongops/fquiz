"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

// Simple Linear Congruential Generator (LCG) for deterministic, secure-safe local random numbers
function createRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function Stars(props: any) {
  const ref = useRef<THREE.Points>(null!);
  const sphere = useMemo(() => {
    const rand = createRandom(12345)
    const positions = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000; i++) {
      const r = 10;
      const theta = 2 * Math.PI * rand();
      const phi = Math.acos(2 * rand() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  const groupProps = { rotation: [0, 0, Math.PI / 4] as [number, number, number] };

  return (
    <group {...groupProps}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#5D7B6F"
          size={0.02}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.4}
        />
      </Points>
    </group>
  );
}

export default function Scene3D() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        {(() => {
          const ambientLightProps = { intensity: 0.5 };
          const pointLightProps = { position: [10, 10, 10] as [number, number, number], intensity: 1 };
          return (
            <>
              <ambientLight {...ambientLightProps} />
              <pointLight {...pointLightProps} />
            </>
          );
        })()}
        <Stars />
      </Canvas>
    </div>
  );
}

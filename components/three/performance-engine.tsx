'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

type Props = {
  values: (number | null)[];
  labels: string[];
  accent?: number;
};

function Bars({ values }: { values: (number | null)[] }) {
  const group = useRef<THREE.Group>(null);
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.position.y = Math.sin(t * 0.8 + i * 0.7) * 0.05;
    });
    group.current.rotation.y = Math.sin(t * 0.25) * 0.06;
  });
  return (
    <group ref={group} position={[-0.55, 0, 0]}>
      {values.map((v, i) => {
        const h = v === null ? 0.08 : Math.max(0.1, (v / max) * 1.5);
        return (
          <mesh key={i} position={[(i - (values.length - 1) / 2) * 0.34, h / 2 - 0.6, 0]} castShadow>
            <boxGeometry args={[0.2, h, 0.2]} />
            <meshPhysicalMaterial
              color={v === null ? '#2a3440' : i % 2 ? '#5eead4' : '#38bdf8'}
              metalness={0.35}
              roughness={0.12}
              transmission={v === null ? 0 : 0.35}
              transparent
              opacity={v === null ? 0.5 : 0.82}
              emissive={v === null ? '#000000' : i % 2 ? '#1fb9a0' : '#0ea5e9'}
              emissiveIntensity={0.22}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ResultObject() {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ring.current) return;
    const t = state.clock.elapsedTime;
    ring.current.rotation.z = -t * 0.35;
    ring.current.rotation.x = Math.sin(t * 0.4) * 0.15;
  });
  return (
    <group position={[0.85, 0.1, 0]}>
      <mesh>
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshPhysicalMaterial color="#101820" metalness={1} roughness={0.1} clearcoat={1} envMapIntensity={1.2} />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[0.52, 0.014, 8, 120]} />
        <meshStandardMaterial color="#5eead4" emissive="#5eead4" emissiveIntensity={1.1} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh rotation={[1.2, 0.4, 0]}>
        <torusGeometry args={[0.68, 0.006, 8, 120]} />
        <meshStandardMaterial color="#9fb3c8" metalness={1} roughness={0.2} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function GlassShards() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.05;
  });
  return (
    <group ref={group}>
      <mesh position={[-1.4, 0.7, -0.4]} rotation={[0.3, 0.5, 0.2]}>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshPhysicalMaterial color="#7dd3fc" transparent opacity={0.22} roughness={0.05} metalness={0.2} transmission={0.5} />
      </mesh>
      <mesh position={[1.5, -0.6, -0.3]} rotation={[0.6, 0.2, 0.4]}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshPhysicalMaterial color="#5eead4" transparent opacity={0.28} roughness={0.05} metalness={0.2} transmission={0.5} />
      </mesh>
    </group>
  );
}

function Rig() {
  useFrame((state) => {
    const x = state.pointer.x * 0.12;
    const y = state.pointer.y * 0.08;
    state.camera.position.lerp(new THREE.Vector3(x, 0.15 + y, 4.1), 0.04);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function PerformanceEngine({ values, labels, accent }: Props) {
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    obs.observe(host.current);
    return () => obs.disconnect();
  }, []);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  return (
    <div className="engine" ref={host} aria-hidden="true">
      {visible ? (
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [0, 0.15, 4.1], fov: 34 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          frameloop={reduced ? 'demand' : 'always'}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} color="#e2e8f0" />
          <pointLight position={[-3, 1, 2]} intensity={8} color="#5eead4" distance={8} />
          <Float speed={reduced ? 0 : 0.8} rotationIntensity={reduced ? 0 : 0.12} floatIntensity={reduced ? 0 : 0.25}>
            <Bars values={values} />
            <ResultObject />
            <GlassShards />
          </Float>
          <Rig />
        </Canvas>
      ) : (
        <div className="engine-fallback">
          {values.map((v, i) => (
            <i key={i} style={{ height: `${Math.max(8, ((v ?? 0) / max) * 120)}px` }} />
          ))}
        </div>
      )}
      <div className="engine-label">PERFORMANCE ENGINE</div>
      <div className="engine-ring">
        <b>{values.reduce((s, v) => s + (v ?? 0), 0)}</b>
        <span>sälj · 7 dagar</span>
      </div>
      <span className="sr-only">{labels.map((l, i) => `${l}: ${values[i] ?? 'ej registrerad'}`).join(', ')}</span>
    </div>
  );
}

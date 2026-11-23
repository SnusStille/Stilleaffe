'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

function CoreSphere() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.08;
    ref.current.rotation.x = Math.sin(t * 0.15) * 0.08;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1.55, 96, 96]} />
        <meshPhysicalMaterial
          color="#141c24"
          metalness={1}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Outer glass shell */}
      <mesh scale={1.035}>
        <sphereGeometry args={[1.55, 64, 64]} />
        <meshPhysicalMaterial
          color="#8ff7dc"
          metalness={0}
          roughness={0.05}
          transmission={0.55}
          thickness={0.4}
          transparent
          opacity={0.14}
          envMapIntensity={1.2}
        />
      </mesh>
      <pointLight position={[1.6, 1.4, 2.2]} intensity={14} color="#5eead4" distance={8} />
      <pointLight position={[-2.2, -0.8, 1.2]} intensity={10} color="#38bdf8" distance={7} />
    </group>
  );
}

function Rings() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.z = t * 0.05;
    group.current.children.forEach((child, i) => {
      child.rotation.z = t * (0.06 + i * 0.025) * (i % 2 ? -1 : 1);
    });
  });
  const rings = [
    { radius: 2.05, tube: 0.012, rot: [1.15, 0.3, 0.2], color: '#dbe6f2' },
    { radius: 2.38, tube: 0.008, rot: [0.55, 1.05, -0.3], color: '#5eead4' },
    { radius: 2.72, tube: 0.006, rot: [2.0, -0.35, 0.5], color: '#9fb3c8' },
  ];
  return (
    <group ref={group}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={r.rot as any}>
          <torusGeometry args={[r.radius, r.tube, 12, 220]} />
          <meshStandardMaterial color={r.color} metalness={1} roughness={0.22} emissive={r.color} emissiveIntensity={i === 1 ? 0.35 : 0.08} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Particles({ count = 420 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.4 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
      arr[i * 3 + 2] = r * Math.cos(phi) * 0.8 - 1;
    }
    return arr;
  }, [count]);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.015;
    ref.current.rotation.x = Math.sin(t * 0.08) * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color="#5eead4" transparent opacity={0.55} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Monogram() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.5) * 0.04;
    group.current.rotation.z = Math.sin(t * 0.3) * 0.015;
  });
  const mint = '#5eead4';
  return (
    <group ref={group} position={[0, 0, 1.58]}>
      {/* Back L */}
      <mesh position={[-0.36, 0.28, 0]}>
        <boxGeometry args={[0.12, 1.0, 0.1]} />
        <meshStandardMaterial color="#cfd8e3" metalness={1} roughness={0.25} transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.11, -0.22, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.1]} />
        <meshStandardMaterial color="#cfd8e3" metalness={1} roughness={0.25} transparent opacity={0.7} />
      </mesh>
      {/* Front L */}
      <mesh position={[0.2, 0.02, 0.04]}>
        <boxGeometry args={[0.12, 1.0, 0.1]} />
        <meshStandardMaterial color={mint} emissive={mint} emissiveIntensity={1.1} metalness={0.4} roughness={0.25} />
      </mesh>
      <mesh position={[0.45, -0.48, 0.04]}>
        <boxGeometry args={[0.5, 0.12, 0.1]} />
        <meshStandardMaterial color={mint} emissive={mint} emissiveIntensity={1.1} metalness={0.4} roughness={0.25} />
      </mesh>
      {/* Label pin */}
      <mesh position={[0.78, 0.36, 0.04]}>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial color={mint} emissive={mint} emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}

function CameraRig({ reduced }: { reduced: boolean }) {
  const vec = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const x = Math.sin(t * 0.12) * 0.35 + state.pointer.x * 0.25;
    const y = Math.cos(t * 0.1) * 0.18 + state.pointer.y * 0.18;
    vec.set(x, y, 6.4);
    state.camera.position.lerp(vec, 0.03);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <color attach="background" args={['#05070a']} />
      <fog attach="fog" args={['#05070a', 7, 16]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} color="#e2e8f0" />
      <directionalLight position={[-5, -2, 3]} intensity={0.5} color="#5eead4" />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={3} position={[0, 5, -6]} scale={[12, 6, 1]} color="#5eead4" />
          <Lightformer intensity={2} position={[-6, 2, 3]} scale={[6, 3, 1]} color="#7dd3fc" />
          <Lightformer intensity={2.5} position={[6, -1, 2]} scale={[5, 4, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[0, -6, 1]} scale={[10, 2, 1]} color="#1fb9a0" />
        </Environment>
      </Suspense>
      <Float speed={reduced ? 0 : 1.1} rotationIntensity={reduced ? 0 : 0.25} floatIntensity={reduced ? 0 : 0.5}>
        <CoreSphere />
      </Float>
      <Rings />
      <Particles />
      <Monogram />
      <CameraRig reduced={reduced} />
    </>
  );
}

export default function LoginScene() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <Canvas
      className="auth-canvas"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.4], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reduced ? 'demand' : 'always'}
    >
      <Scene reduced={reduced} />
    </Canvas>
  );
}

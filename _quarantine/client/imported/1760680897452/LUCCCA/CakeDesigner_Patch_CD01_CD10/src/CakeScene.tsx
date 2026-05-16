/**
 * LUCCCA | CD-PATCH Scene
 * Full react-three-fiber scene that wires OrbitControls, CameraRig, AutoRotateController.
 */
import React, { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from './useOrbitControls';
import { CameraRig } from './CameraRig';
import { AutoRotateController } from './AutoRotateController';

const CakeMesh: React.FC<{ autoRotate: boolean }> = ({ autoRotate }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [controller] = useState(() => new AutoRotateController(null, 0.01));

  useFrame(() => controller.tick());

  React.useEffect(() => {
    controller.setTarget(meshRef.current);
    controller.toggle(autoRotate);
  }, [autoRotate]);

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[2, 2, 3, 64]} />
      <meshStandardMaterial color="#F5D0A9" />
    </mesh>
  );
};

const RigInit: React.FC = () => {
  const { camera } = useThree();
  React.useEffect(() => {
    const rig = new CameraRig(camera as THREE.PerspectiveCamera);
    rig.goTo('iso', 10);
  }, [camera]);
  return null;
};

export const CakeScene: React.FC = () => {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div className="w-full h-[600px]">
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <RigInit />
        <OrbitControls />
        <CakeMesh autoRotate={autoRotate} />
      </Canvas>
      <button
        className="mt-2 px-3 py-2 bg-blue-500 text-white rounded"
        onClick={() => setAutoRotate(v => !v)}
      >
        Toggle Rotate
      </button>
    </div>
  );
};

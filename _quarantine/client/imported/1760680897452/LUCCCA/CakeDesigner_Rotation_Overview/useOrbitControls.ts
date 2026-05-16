/**
 * LUCCCA | CD-09
 * useOrbitControls: Hook wrapper for Three.js OrbitControls (or drei's OrbitControls).
 */
import { useEffect } from 'react';
import * as THREE from 'three';
// Lazy import in real code: import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function useOrbitControls(camera: THREE.PerspectiveCamera, rendererDomElement: HTMLElement) {
  useEffect(() => {
    // placeholder; user can replace with actual OrbitControls
    function onWheel(e: WheelEvent) {
      camera.position.z += e.deltaY * 0.001;
      camera.updateProjectionMatrix();
    }
    rendererDomElement.addEventListener('wheel', onWheel);
    return () => {
      rendererDomElement.removeEventListener('wheel', onWheel);
    };
  }, [camera, rendererDomElement]);
}

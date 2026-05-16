import * as THREE from 'three';
import { CameraRig } from '../src/CameraRig';

test('CameraRig can go to overview', () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  const rig = new CameraRig(camera);
  rig.goTo('overview', 12);
  expect(camera.position.length()).toBeGreaterThan(0);
});

import * as THREE from 'three';
import { AutoRotateController } from '../src/AutoRotateController';

test('AutoRotateController toggles and ticks', () => {
  const obj = new THREE.Object3D();
  const ctrl = new AutoRotateController(obj, 0.1);
  ctrl.toggle(true);
  const y0 = obj.rotation.y;
  ctrl.tick();
  expect(obj.rotation.y).toBeCloseTo(y0 + 0.1, 5);
});

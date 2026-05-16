import * as THREE from "three";
export type LightingPreset = {
  name: string;
  apply: (scene: THREE.Scene) => {
    key: THREE.DirectionalLight;
    ambient: THREE.AmbientLight;
    extras?: THREE.Object3D[];
  };
};
function clearOld(scene: THREE.Scene) {
  const toRemove: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if ((o as any).__isPresetLight) toRemove.push(o);
  });
  toRemove.forEach((o) => scene.remove(o));
}
function tag<T extends THREE.Object3D>(o: T): T {
  (o as any).__isPresetLight = true;
  return o;
}
export const MorningSoft: LightingPreset = {
  name: "Morning Soft",
  apply(scene) {
    clearOld(scene);
    const amb = tag(new THREE.AmbientLight(0xfff2e0, 0.6));
    const dir = tag(new THREE.DirectionalLight(0xffdfbf, 0.9));
    dir.position.set(2, 4, 1);
    dir.castShadow = true;
    scene.add(amb, dir);
    return { key: dir, ambient: amb };
  },
};
export const NoonBright: LightingPreset = {
  name: "Noon Bright",
  apply(scene) {
    clearOld(scene);
    const amb = tag(new THREE.AmbientLight(0xffffff, 0.4));
    const dir = tag(new THREE.DirectionalLight(0xffffff, 1.25));
    dir.position.set(5, 8, -2);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(amb, dir);
    return { key: dir, ambient: amb };
  },
};
export const EveningAmbient: LightingPreset = {
  name: "Evening Ambient",
  apply(scene) {
    clearOld(scene);
    const amb = tag(new THREE.AmbientLight(0xffb380, 0.7));
    const dir = tag(new THREE.DirectionalLight(0xff8c3a, 0.6));
    dir.position.set(-2, 3, 2);
    scene.add(amb, dir);
    const rim = tag(new THREE.PointLight(0xff8844, 0.8, 20));
    rim.position.set(0, 2, -4);
    scene.add(rim);
    return { key: dir, ambient: amb, extras: [rim] };
  },
};
export const NightEvent: LightingPreset = {
  name: "Night Event",
  apply(scene) {
    clearOld(scene);
    const amb = tag(new THREE.AmbientLight(0x223355, 0.5));
    const dir = tag(new THREE.DirectionalLight(0x88ccff, 0.8));
    dir.position.set(1, 4, 1);
    scene.add(amb, dir);
    const blueFill = tag(new THREE.PointLight(0x3366ff, 0.9, 30));
    blueFill.position.set(3, 2, 3);
    const pinkFill = tag(new THREE.PointLight(0xff66aa, 0.8, 30));
    pinkFill.position.set(-3, 2, -2);
    scene.add(blueFill, pinkFill);
    return { key: dir, ambient: amb, extras: [blueFill, pinkFill] };
  },
};
export const Presets = [MorningSoft, NoonBright, EveningAmbient, NightEvent];

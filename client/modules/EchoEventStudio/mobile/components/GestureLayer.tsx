import React, { useMemo, useRef } from "react";
import { View, StyleSheet } from "react-native";
import * as THREE from "three";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  deepCloneObject3D,
  intersectGround,
  rayFromScreen,
  raycastPick,
  snapToGrid,
  Viewport,
} from "../utils/three-helpers";
export type GestureLayerProps = {
  camera: THREE.Camera;
  scene: THREE.Scene;
  viewport: Viewport;
  selected: THREE.Object3D | null;
  onSelect: (obj: THREE.Object3D | null) => void;
  onDuplicate?: (clone: THREE.Object3D) => void;
  snap?: boolean;
  gridSize?: number;
  minScale?: number;
  maxScale?: number;
  enableRotate?: boolean;
};
export default function GestureLayer({
  camera,
  scene,
  viewport,
  selected,
  onSelect,
  onDuplicate,
  snap = true,
  gridSize = 0.1,
  minScale = 0.2,
  maxScale = 4,
  enableRotate = true,
}: GestureLayerProps) {
  const dragOffsetRef = useRef<THREE.Vector3 | null>(null);
  const initialScaleRef = useRef<THREE.Vector3 | null>(null);
  const initialRotYRef = useRef<number>(0);
  const roots = useMemo(() => [scene] as THREE.Object3D[], [scene]);
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      const hit = raycastPick(
        e.absoluteX,
        e.absoluteY,
        viewport,
        camera,
        roots,
      );
      onSelect(hit?.object ?? null);
    });
  const pan = Gesture.Pan()
    .onBegin((e) => {
      if (!selected) return;
      const ray = rayFromScreen(e.absoluteX, e.absoluteY, viewport, camera);
      const hit = intersectGround(ray, 0);
      if (!hit) return;
      const current = new THREE.Vector3(
        selected.position.x,
        0,
        selected.position.z,
      );
      dragOffsetRef.current = current.clone().sub(hit);
    })
    .onChange((e) => {
      if (!selected) return;
      const ray = rayFromScreen(e.absoluteX, e.absoluteY, viewport, camera);
      const hit = intersectGround(ray, 0);
      if (!hit) return;
      const offset = dragOffsetRef.current ?? new THREE.Vector3();
      const target = hit.clone().add(offset);
      const finalPos = snap ? snapToGrid(target, gridSize) : target;
      selected.position.x = finalPos.x;
      selected.position.z = finalPos.z;
    });
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      if (!selected) return;
      initialScaleRef.current = selected.scale.clone();
    })
    .onChange((e) => {
      if (!selected || !initialScaleRef.current) return;
      const s = Math.max(minScale, Math.min(maxScale, e.scale));
      selected.scale.set(
        initialScaleRef.current.x * s,
        initialScaleRef.current.y * s,
        initialScaleRef.current.z * s,
      );
    });
  const rotation = Gesture.Rotation()
    .onBegin(() => {
      if (!selected) return;
      initialRotYRef.current = selected.rotation.y;
    })
    .onChange((e) => {
      if (!selected) return;
      if (!enableRotate) return;
      selected.rotation.y = initialRotYRef.current + e.rotation;
    });
  const longPress = Gesture.LongPress()
    .minDuration(550)
    .onStart(() => {
      if (!selected) return;
      const clone = deepCloneObject3D(selected);
      clone.position.copy(
        selected.position.clone().add(new THREE.Vector3(0.2, 0, 0)),
      );
      scene.add(clone);
      onSelect?.(clone);
      onDuplicate?.(clone);
    }); // Ensure long-press takes precedence over tap tap.requireToFail(longPress); const composed = Gesture.Simultaneous(pan, pinch, rotation, longPress, tap); return ( <GestureDetector gesture={composed}> <View style={styles.hit} pointerEvents="box-only" /> </GestureDetector> );
}
const styles = StyleSheet.create({ hit: { ...StyleSheet.absoluteFillObject } });

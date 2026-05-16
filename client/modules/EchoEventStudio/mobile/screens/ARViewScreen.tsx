import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Renderer } from "expo-three";
import GestureLayer from "../components/GestureLayer";
import { deepCloneObject3D, Viewport } from "../utils/three-helpers";
export default function ARViewScreen() {
  const glViewRef = useRef<GLView | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [selected, setSelected] = useState<THREE.Object3D | null>(null);
  const [snap, setSnap] = useState(true);
  const [vp, setVp] = useState<Viewport>({ width: 1, height: 1 });
  const onContextCreate = useCallback(async (gl: any) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    setVp({ width, height });
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000");
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 100);
    camera.position.set(0, 0.6, 1.2);
    cameraRef.current = camera;
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(1, 2, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        metalness: 0.1,
        roughness: 0.9,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.userData.pickable = false;
    scene.add(ground);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshStandardMaterial({ color: "#f59e0b" }),
    );
    box.position.set(0, 0.1, -0.6);
    scene.add(box);
    setSelected(box);
    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  }, []);
  const duplicateSelected = useCallback(() => {
    if (!selected || !sceneRef.current) return;
    const clone = deepCloneObject3D(selected);
    clone.position.copy(
      selected.position.clone().add(new THREE.Vector3(0.25, 0, 0)),
    );
    sceneRef.current.add(clone);
    setSelected(clone);
  }, [selected]);
  const gestureLayer = useMemo(() => {
    if (!cameraRef.current || !sceneRef.current) return null;
    return (
      <GestureLayer
        camera={cameraRef.current}
        scene={sceneRef.current}
        viewport={vp}
        selected={selected}
        onSelect={setSelected}
        onDuplicate={() => {}}
        snap={snap}
        gridSize={0.1}
        enableRotate
        minScale={0.2}
        maxScale={3}
      />
    );
  }, [selected, snap, vp]);
  return (
    <View style={styles.container}>
      {" "}
      <GLView
        style={styles.fill}
        ref={glViewRef}
        onContextCreate={onContextCreate}
      />{" "}
      {gestureLayer}{" "}
      <View style={styles.overlay} pointerEvents="box-none">
        {" "}
        <View style={styles.toolbar}>
          {" "}
          <Text style={styles.label}>Snap</Text>{" "}
          <Switch value={snap} onValueChange={setSnap} />{" "}
          <View style={styles.spacer} />{" "}
          <Text onPress={duplicateSelected} style={styles.link}>
            {" "}
            Duplicate{" "}
          </Text>{" "}
        </View>{" "}
      </View>{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fill: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  toolbar: {
    margin: 12,
    backgroundColor: "rgba(20,20,20,0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  label: { color: "#fff", marginRight: 8 },
  link: { color: "#93c5fd", fontWeight: "600" },
  spacer: { flex: 1 },
});

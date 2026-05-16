import React, { useCallback, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Renderer } from "expo-three";
import WaterSurfacePro from "../components/WaterSurfacePro";
import LightingPanel from "../components/LightingPanel";
import { MorningSoft } from "../lib/lightingPresets";
export default function LightingDemoScreen() {
  const glViewRef = useRef<GLView | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [ready, setReady] = useState(false);
  const onContextCreate = useCallback(async (gl: any) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    rendererRef.current = renderer as any;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b1020");
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(2, 2, 5);
    cameraRef.current = camera;
    MorningSoft.apply(scene);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: "#1f2937" }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.receiveShadow = true;
    scene.add(ground);
    setReady(true);
    const render = () => {
      requestAnimationFrame(render);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        (rendererRef.current as any).render(
          sceneRef.current,
          cameraRef.current,
        );
        gl.endFrameEXP();
      }
    };
    render();
  }, []);
  return (
    <View style={styles.container}>
      {" "}
      <GLView
        style={styles.fill}
        ref={glViewRef}
        onContextCreate={onContextCreate}
      />{" "}
      {ready && sceneRef.current ? (
        <>
          {" "}
          <WaterSurfacePro
            scene={sceneRef.current}
            renderer={rendererRef.current as any}
          />{" "}
          <LightingPanel scene={sceneRef.current} />{" "}
        </>
      ) : null}{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  fill: { ...StyleSheet.absoluteFillObject },
});

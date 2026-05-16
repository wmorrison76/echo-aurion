import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
export interface Weather3DPanelProps {
  mode?: "quick" | "decision";
  lat?: number;
  lon?: number;
  eventStartISO?: string;
  eventEndISO?: string;
  locationLabel?: string;
}
const CLOUD_TEXTURE_URL =
  "https://cdn.jsdelivr.net/gh/typpo/spacekit/examples/textures/earthcloudmaptrans.jpg";
export default function Weather3DPanel({
  mode = "quick",
  lat = 26.1224,
  lon = -80.1373,
  eventStartISO,
  eventEndISO,
  locationLabel = "Fort Lauderdale, FL",
}: Weather3DPanelProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number>();
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }
    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    scene.add(ambientLight, directionalLight);
    const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x223344,
      transparent: true,
      opacity: 0.85,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);
    const cloudGeometry = new THREE.SphereGeometry(5.05, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);
    const textureLoader = new THREE.TextureLoader();
    const cloudTexture = textureLoader.load(CLOUD_TEXTURE_URL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      cloudMaterial.map = texture;
      cloudMaterial.needsUpdate = true;
    });
    const rainGeometry = new THREE.BufferGeometry();
    const rainParticleCount = 1500;
    const rainPositions = new Float32Array(rainParticleCount * 3);
    for (let i = 0; i < rainParticleCount; i += 1) {
      const idx = i * 3;
      rainPositions[idx] = (Math.random() - 0.5) * 10;
      rainPositions[idx + 1] = Math.random() * 5;
      rainPositions[idx + 2] = (Math.random() - 0.5) * 10;
    }
    rainGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(rainPositions, 3),
    );
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x66ccff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const rainPoints = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rainPoints);
    setSceneReady(true);
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      cloudMesh.rotation.y += 0.0006;
      const positions = rainGeometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const array = positions.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 1] -= 0.1;
        if (array[i + 1] < -5) {
          array[i + 1] = 5;
        }
      }
      positions.needsUpdate = true;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    const handleResize = () => {
      if (!mount) {
        return;
      }
      const newWidth = mount.clientWidth || width;
      const newHeight = mount.clientHeight || height;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      controls.dispose();
      renderer.dispose();
      earthGeometry.dispose();
      earthMaterial.dispose();
      cloudGeometry.dispose();
      cloudMaterial.dispose();
      rainGeometry.dispose();
      rainMaterial.dispose();
      cloudTexture.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      setSceneReady(false);
    };
  }, [lat, lon]);
  const startLabel = eventStartISO
    ? new Date(eventStartISO).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  const endLabel = eventEndISO
    ? new Date(eventEndISO).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  return (
    <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
      {" "}
      <div ref={mountRef} className="absolute inset-0" />{" "}
      <div className="absolute left-4 top-4 text-white/90">
        {" "}
        <h3 className="text-lg font-medium">{locationLabel}</h3>{" "}
        <p className="text-xs text-white/60">Mode: {mode.toUpperCase()}</p>{" "}
      </div>{" "}
      {sceneReady && (
        <div className="absolute bottom-4 left-4 max-w-xs rounded-xl bg-background p-3 text-xs text-white/80 backdrop-blur-md">
          {" "}
          <p>
            {" "}
            <strong>Event Window:</strong> {startLabel} – {endLabel}{" "}
          </p>{" "}
          <p>
            {" "}
            <strong>Status:</strong> Visualizing satellite, precipitation, and
            wind layers{" "}
          </p>{" "}
          <p>
            {" "}
            <strong>Controls:</strong> Drag = orbit · Scroll = zoom{" "}
          </p>{" "}
        </div>
      )}{" "}
    </div>
  );
}

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { PlannerScene, PlannerItem } from "./PlannerSchema";
export interface BridgeOptions {
  assetRoot?: string;
  onProgress?: (message: string) => void;
  onError?: (error: Error) => void;
}
export class PlannerToStudioBridge {
  private readonly scene: THREE.Scene;
  private readonly loader: GLTFLoader;
  private readonly opts: BridgeOptions;
  constructor(scene: THREE.Scene, opts: BridgeOptions = {}) {
    this.scene = scene;
    this.opts = opts;
    this.loader = new GLTFLoader();
  }
  async import(sceneData: PlannerScene) {
    this.opts.onProgress?.(`Importing room ${sceneData.room.name}`);
    this.addRoom(sceneData);
    for (const item of sceneData.items) {
      try {
        if (item.modelUrl) {
          await this.addModelItem(item);
        } else {
          this.addParametricItem(item);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.opts.onError?.(err);
        this.addParametricItem(item);
      }
    }
  }
  private addRoom(data: PlannerScene) {
    const floorGeo = new THREE.PlaneGeometry(data.room.w, data.room.d);
    const floorMat = new THREE.MeshStandardMaterial({
      color: "#888888",
      roughness: 0.9,
      metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    if (data.room.h && data.room.h > 0) {
      const wallMat = new THREE.MeshStandardMaterial({ color: "#e9ecef" });
      const wallGeo1 = new THREE.PlaneGeometry(data.room.w, data.room.h);
      const wall1 = new THREE.Mesh(wallGeo1, wallMat);
      wall1.position.set(0, data.room.h / 2, -data.room.d / 2);
      this.scene.add(wall1);
      const wall2 = wall1.clone();
      wall2.rotation.y = Math.PI;
      wall2.position.set(0, data.room.h / 2, data.room.d / 2);
      this.scene.add(wall2);
      const wallGeo2 = new THREE.PlaneGeometry(data.room.d, data.room.h);
      const wall3 = new THREE.Mesh(wallGeo2, wallMat);
      wall3.rotation.y = Math.PI / 2;
      wall3.position.set(-data.room.w / 2, data.room.h / 2, 0);
      this.scene.add(wall3);
      const wall4 = wall3.clone();
      wall4.rotation.y = -Math.PI / 2;
      wall4.position.set(data.room.w / 2, data.room.h / 2, 0);
      this.scene.add(wall4);
    }
  }
  private addParametricItem(item: PlannerItem) {
    const group = new THREE.Group();
    switch (item.kind) {
      case "roundTable": {
        const radius = item.r ?? 0.76;
        const geometry = new THREE.CylinderGeometry(radius, radius, 0.05, 32);
        const material = new THREE.MeshStandardMaterial({ color: "#d2b48c" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.75;
        group.add(mesh);
        break;
      }
      case "rectTable": {
        const width = item.w ?? 1.83;
        const depth = item.d ?? 0.76;
        const height = item.h ?? 0.76;
        const geometry = new THREE.BoxGeometry(width, 0.05, depth);
        const material = new THREE.MeshStandardMaterial({ color: "#d2b48c" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height;
        group.add(mesh);
        break;
      }
      case "chair": {
        const geometry = new THREE.BoxGeometry(0.45, 0.05, 0.45);
        const material = new THREE.MeshStandardMaterial({ color: "#cccccc" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.45;
        group.add(mesh);
        break;
      }
      case "buffet": {
        const width = item.w ?? 1.8;
        const depth = item.d ?? 0.8;
        const height = item.h ?? 0.9;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: "#a0522d" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        group.add(mesh);
        break;
      }
      case "bar": {
        const width = item.w ?? 2.4;
        const depth = item.d ?? 0.8;
        const height = item.h ?? 1.1;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: "#444444" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        group.add(mesh);
        break;
      }
      case "serpentine": {
        const geometry = new THREE.TorusGeometry(2, 0.05, 12, 64, Math.PI);
        const material = new THREE.MeshStandardMaterial({ color: "#b0e0e6" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = 0.76;
        group.add(mesh);
        break;
      }
      case "stage": {
        const width = item.w ?? 4;
        const depth = item.d ?? 2;
        const height = item.h ?? 0.6;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: "#111111" });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = height / 2;
        group.add(mesh);
        break;
      }
      case "zone": {
        const width = item.w ?? 2;
        const depth = item.d ?? 2;
        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshBasicMaterial({
          color: "#00ffff",
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        break;
      }
      default:
        break;
    }
    group.position.set(item.x, 0, item.y);
    if (typeof item.rotation === "number") {
      group.rotation.y = item.rotation;
    }
    group.userData = { id: item.id, kind: item.kind };
    this.scene.add(group);
  }
  private async addModelItem(item: PlannerItem) {
    const url = this.resolveUrl(item.modelUrl!);
    this.opts.onProgress?.(`Loading ${item.kind}:${item.id} → ${url}`);
    const glb = await this.loader.loadAsync(url);
    const root = glb.scene.clone(true);
    root.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    root.position.set(item.x, 0, item.y);
    if (typeof item.rotation === "number") {
      root.rotation.y = item.rotation;
    }
    this.scene.add(root);
  }
  private resolveUrl(url: string) {
    if (url.startsWith("http") || url.startsWith("/")) {
      return url;
    }
    const base = this.opts.assetRoot ?? "/assets/glb";
    return `${base}/${url}`;
  }
}

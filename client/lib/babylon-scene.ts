/**
 * Babylon.js Scene for 3D Avatar
 * Handles 3D rendering, avatar loading, animation playback
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { LipSyncEngine } from './lip-sync-engine';
import { FacialExpressions } from './facial-expressions';

export interface AvatarConfig {
  userId: string;
  avatarUrl?: string; // Ready Player Me GLB URL
  containerElement: HTMLCanvasElement;
  width?: number;
  height?: number;
}

export class BabylonScene {
  private scene: BABYLON.Scene | null = null;
  private engine: BABYLON.Engine | null = null;
  private avatar: BABYLON.AbstractMesh | null = null;
  private animationGroups: BABYLON.AnimationGroup[] = [];
  
  private lipSyncEngine: LipSyncEngine | null = null;
  private facialExpressions: FacialExpressions | null = null;
  
  private config: AvatarConfig;
  private currentExpression: string = 'neutral';
  private isSpeaking: boolean = false;
  
  constructor(config: AvatarConfig) {
    this.config = config;
    this.initialize();
  }
  
  private initialize(): void {
    // Create Babylon.js engine
    this.engine = new BABYLON.Engine(this.config.containerElement, true, {
      antialias: true,
      preserveDrawingBuffer: false,
      alpha: true,
    });
    
    // Create scene
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.collisionsEnabled = true;
    this.scene.useRightHandedSystem = true;
    
    // Setup lighting for realistic rendering
    this.setupLighting();
    
    // Setup camera
    this.setupCamera();
    
    // Initialize sub-systems
    this.lipSyncEngine = new LipSyncEngine(this.scene);
    this.facialExpressions = new FacialExpressions(this.scene);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine?.resize();
    });
    
    // Start render loop
    this.startRenderLoop();
  }
  
  private setupLighting(): void {
    if (!this.scene) return;
    
    // Soft lighting for realistic skin rendering
    const light1 = new BABYLON.HemisphericLight(
      'hemiLight',
      new BABYLON.Vector3(0.5, 1, 0.5),
      this.scene
    );
    light1.intensity = 0.9;
    light1.groundColor = new BABYLON.Color3(0.2, 0.2, 0.25);
    
    // Key light (main fill light)
    const keyLight = new BABYLON.PointLight(
      'keyLight',
      new BABYLON.Vector3(2, 2, 2),
      this.scene
    );
    keyLight.intensity = 1.0;
    keyLight.range = 50;
    
    // Rim light (edge highlighting)
    const rimLight = new BABYLON.SpotLight(
      'rimLight',
      new BABYLON.Vector3(-2, 1.5, 2),
      new BABYLON.Vector3(0, 0, 0),
      Math.PI / 3,
      1,
      this.scene
    );
    rimLight.intensity = 0.5;
    
    // Shadow maps for depth
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, keyLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 16;
  }
  
  private setupCamera(): void {
    if (!this.scene) return;
    
    // Position camera at avatar face level
    const camera = new BABYLON.UniversalCamera(
      'camera',
      new BABYLON.Vector3(0, 1.6, 2),
      this.scene
    );
    
    camera.attachControl(this.config.containerElement, true);
    camera.target = new BABYLON.Vector3(0, 1.7, 0); // Look at face
    camera.inertia = 0.7;
    camera.speed = 0;
    camera.angularSensibility = 0;
    
    // Restrict camera movement
    camera.keysUp = [];
    camera.keysDown = [];
    camera.keysLeft = [];
    camera.keysRight = [];
  }
  
  async loadAvatar(avatarUrl: string): Promise<void> {
    if (!this.scene) throw new Error('Scene not initialized');
    
    try {
      // Load GLB model from Ready Player Me
      const result = await BABYLON.SceneLoader.ImportMeshAsync(
        '',
        '',
        avatarUrl,
        this.scene
      );
      
      this.avatar = result.meshes[0];
      this.animationGroups = result.animationGroups;
      
      // Center avatar
      const bounds = this.avatar.getBoundingInfo();
      const center = bounds.boundingBox.centerWorld;
      this.avatar.position.x -= center.x;
      this.avatar.position.z -= center.z;
      
      // Ensure proper scaling
      this.avatar.scaling = new BABYLON.Vector3(1, 1, 1);
      
      // Cast shadows
      this.avatar.receiveShadows = true;
      this.avatar.meshes?.forEach(mesh => {
        mesh.receiveShadows = true;
      });
      
      // Setup morphing for expressions
      if (result.meshes[0].morphTargetManager) {
        this.facialExpressions?.setMorphTargetManager(
          result.meshes[0].morphTargetManager
        );
      }
      
      console.log('[AVATAR] Loaded successfully:', avatarUrl);
    } catch (error) {
      console.error('[AVATAR] Failed to load:', error);
      throw error;
    }
  }
  
  /**
   * Play audio and synchronize lip-sync animation
   */
  async playAudio(audioData: AudioBuffer | Blob): Promise<void> {
    if (!this.scene) return;
    
    this.isSpeaking = true;
    
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = audioData instanceof Blob
        ? await audioBuffer.arrayBuffer().then(ab => 
            audioContext.decodeAudioData(ab)
          )
        : audioData;
      
      // Start audio playback
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      // Generate lip-sync data
      if (this.lipSyncEngine) {
        const visemeSequence = await this.lipSyncEngine.generateVisemes(audioBuffer);
        this.playVisemeSequence(visemeSequence);
      }
      
      // Wait for audio to finish
      await new Promise(resolve => {
        source.onended = resolve;
      });
      
      this.isSpeaking = false;
    } catch (error) {
      console.error('[AVATAR] Audio playback error:', error);
      this.isSpeaking = false;
    }
  }
  
  /**
   * Apply sequence of visemes (mouth shapes) over time
   */
  private playVisemeSequence(visemes: Array<{ phoneme: string; time: number }>): void {
    let currentIndex = 0;
    const startTime = Date.now();
    
    const updateViseme = () => {
      if (!this.isSpeaking || currentIndex >= visemes.length) return;
      
      const viseme = visemes[currentIndex];
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      if (elapsedTime >= viseme.time) {
        // Apply viseme morphing
        this.applyViseme(viseme.phoneme);
        currentIndex++;
      }
      
      requestAnimationFrame(updateViseme);
    };
    
    updateViseme();
  }
  
  /**
   * Apply facial expression with smooth blending
   */
  applyExpression(expression: string, duration: number = 300): void {
    this.currentExpression = expression;
    
    if (this.facialExpressions) {
      this.facialExpressions.applyExpression(expression, duration);
    }
    
    // Add head movement for emphasis
    if (this.avatar && ['thinking', 'surprised', 'happy'].includes(expression)) {
      this.addHeadMovement(expression);
    }
  }
  
  /**
   * Apply single viseme (mouth shape) for lip-sync
   */
  private applyViseme(phoneme: string): void {
    if (this.lipSyncEngine) {
      this.lipSyncEngine.applyViseme(phoneme, 0.1); // 100ms duration
    }
  }
  
  /**
   * Add natural head movements for expression emphasis
   */
  private addHeadMovement(expression: string): void {
    if (!this.avatar) return;
    
    const movements = {
      thinking: { angle: 0.3, duration: 800 }, // Tilt head
      surprised: { angle: 0.15, duration: 400 }, // Quick tilt
      happy: { angle: 0.2, duration: 600 }, // Nod slightly
      listening: { angle: 0.1, duration: 1000 }, // Subtle tilt
    };
    
    const movement = movements[expression as keyof typeof movements];
    if (!movement) return;
    
    const originalRotation = this.avatar.rotation.z;
    const targetRotation = originalRotation + movement.angle;
    
    // Smooth animation
    BABYLON.Animation.CreateAndStartAnimation(
      'headTilt',
      this.avatar,
      'rotation.z',
      60,
      movement.duration,
      originalRotation,
      targetRotation,
      BABYLON.Animation.ANIMATIONLOOPMODE_RELATIVE
    );
  }
  
  /**
   * Add blinking animation (natural eye closure)
   */
  startBlinking(intervalMs: number = 5000): void {
    setInterval(() => {
      if (!this.isSpeaking) { // Don't blink while speaking
        this.applyExpression('blinking', 150);
        setTimeout(() => {
          this.applyExpression(this.currentExpression, 150);
        }, 150);
      }
    }, intervalMs + Math.random() * 3000);
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      isSpeaking: this.isSpeaking,
      currentExpression: this.currentExpression,
      avatarLoaded: !!this.avatar,
    };
  }
  
  /**
   * Render loop
   */
  private startRenderLoop(): void {
    if (!this.engine) return;
    
    this.engine.runRenderLoop(() => {
      if (this.scene) {
        this.scene.render();
      }
    });
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    if (this.engine) {
      this.engine.dispose();
    }
    if (this.scene) {
      this.scene.dispose();
    }
    if (this.lipSyncEngine) {
      this.lipSyncEngine.dispose();
    }
    if (this.facialExpressions) {
      this.facialExpressions.dispose();
    }
  }
}

export default BabylonScene;

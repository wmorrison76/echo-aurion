import { nanoid } from "nanoid";

export type TriggerType =
  | "click"
  | "hover"
  | "double-click"
  | "long-press"
  | "scroll"
  | "keyboard";
export type ActionType =
  | "navigate"
  | "toggle-visibility"
  | "animate"
  | "toggle-state"
  | "update-text"
  | "custom";
export type AnimationType =
  | "fade"
  | "slide"
  | "scale"
  | "rotate"
  | "bounce"
  | "shake";
export type EasingType =
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "linear"
  | "cubic-bezier";

export interface Interaction {
  id: string;
  name: string;
  trigger: TriggerType;
  sourceElement: string; // element ID
  action: ActionType;
  enabled: boolean;

  // Navigation action
  targetScreen?: string;
  preserveScroll?: boolean;

  // Animation action
  animation?: {
    type: AnimationType;
    duration: number; // ms
    delay: number; // ms
    easing: EasingType;
    repeat: number; // 0 = no repeat, -1 = infinite
    direction: "normal" | "reverse" | "alternate";
  };

  // Toggle visibility action
  toggleElements?: string[]; // element IDs to toggle

  // Custom action
  customCode?: string; // JavaScript code

  // Condition
  condition?: string; // JavaScript expression

  // Metadata
  created: Date;
  modified: Date;
}

export interface AnimationKeyframe {
  time: number; // ms (0-100 as percentage)
  properties: {
    opacity?: number;
    x?: number;
    y?: number;
    scale?: number;
    rotate?: number;
  };
  easing: EasingType;
}

export interface AnimationSequence {
  id: string;
  name: string;
  duration: number; // total ms
  keyframes: AnimationKeyframe[];
  loop: boolean;
  delay: number;
  created: Date;
  modified: Date;
}

export interface InteractionFlow {
  id: string;
  name: string;
  startElement: string;
  interactions: Interaction[];
  flowPath: Array<{ elementId: string; action: ActionType }>;
}

class InteractionEngine {
  private interactions: Map<string, Interaction> = new Map();
  private animationSequences: Map<string, AnimationSequence> = new Map();
  private flows: Map<string, InteractionFlow> = new Map();
  private listeners: Map<string, Function[]> = new Map();
  private activeAnimations: Map<string, any> = new Map();
  private recordingMode = false;
  private recordedPath: Array<{
    elementId: string;
    action: ActionType;
    timestamp: number;
  }> = [];

  constructor() {
    this.loadFromStorage();
  }

  // ===== INTERACTION MANAGEMENT =====

  addInteraction(
    interaction: Omit<Interaction, "id" | "created" | "modified">,
  ): Interaction {
    const newInteraction: Interaction = {
      ...interaction,
      id: nanoid(),
      created: new Date(),
      modified: new Date(),
    };

    this.interactions.set(newInteraction.id, newInteraction);
    this.saveToStorage();
    this.emit("interaction-added", newInteraction);
    return newInteraction;
  }

  updateInteraction(id: string, updates: Partial<Interaction>): void {
    const interaction = this.interactions.get(id);
    if (interaction) {
      const updated = {
        ...interaction,
        ...updates,
        modified: new Date(),
      };
      this.interactions.set(id, updated);
      this.saveToStorage();
      this.emit("interaction-updated", updated);
    }
  }

  deleteInteraction(id: string): void {
    this.interactions.delete(id);
    this.saveToStorage();
    this.emit("interaction-deleted", id);
  }

  getInteraction(id: string): Interaction | undefined {
    return this.interactions.get(id);
  }

  getInteractionsByElement(elementId: string): Interaction[] {
    return Array.from(this.interactions.values()).filter(
      (i) => i.sourceElement === elementId && i.enabled,
    );
  }

  getInteractionsByTrigger(trigger: TriggerType): Interaction[] {
    return Array.from(this.interactions.values()).filter(
      (i) => i.trigger === trigger && i.enabled,
    );
  }

  // ===== ANIMATION SEQUENCES =====

  addAnimationSequence(
    sequence: Omit<AnimationSequence, "id" | "created" | "modified">,
  ): AnimationSequence {
    const newSequence: AnimationSequence = {
      ...sequence,
      id: nanoid(),
      created: new Date(),
      modified: new Date(),
    };

    this.animationSequences.set(newSequence.id, newSequence);
    this.saveToStorage();
    this.emit("animation-added", newSequence);
    return newSequence;
  }

  addKeyframe(sequenceId: string, keyframe: AnimationKeyframe): void {
    const sequence = this.animationSequences.get(sequenceId);
    if (sequence) {
      sequence.keyframes.push(keyframe);
      sequence.keyframes.sort((a, b) => a.time - b.time);
      this.updateAnimationSequence(sequenceId, sequence);
    }
  }

  updateAnimationSequence(
    id: string,
    updates: Partial<AnimationSequence>,
  ): void {
    const sequence = this.animationSequences.get(id);
    if (sequence) {
      const updated = {
        ...sequence,
        ...updates,
        modified: new Date(),
      };
      this.animationSequences.set(id, updated);
      this.saveToStorage();
      this.emit("animation-updated", updated);
    }
  }

  deleteAnimationSequence(id: string): void {
    this.animationSequences.delete(id);
    this.saveToStorage();
    this.emit("animation-deleted", id);
  }

  getAnimationSequence(id: string): AnimationSequence | undefined {
    return this.animationSequences.get(id);
  }

  getAllAnimationSequences(): AnimationSequence[] {
    return Array.from(this.animationSequences.values());
  }

  // ===== ANIMATION PLAYBACK =====

  playAnimation(
    elementId: string,
    sequenceId: string,
    onComplete?: () => void,
  ): void {
    const sequence = this.animationSequences.get(sequenceId);
    if (!sequence) return;

    const animationId = nanoid();
    const startTime = Date.now();
    const repeatCount = sequence.loop ? Infinity : 1;
    let iterations = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % sequence.duration) / sequence.duration;

      if (elapsed > sequence.duration * repeatCount) {
        this.activeAnimations.delete(animationId);
        if (onComplete) onComplete();
        return;
      }

      // Interpolate keyframe properties
      const frame = this.interpolateKeyframe(sequence.keyframes, progress);
      this.emit("animation-frame", { elementId, frame, progress });

      requestAnimationFrame(animate);
    };

    this.activeAnimations.set(animationId, {
      elementId,
      sequenceId,
      startTime,
    });
    animate();
  }

  stopAnimation(elementId: string): void {
    Array.from(this.activeAnimations.entries()).forEach(([id, anim]) => {
      if (anim.elementId === elementId) {
        this.activeAnimations.delete(id);
      }
    });
  }

  private interpolateKeyframe(
    keyframes: AnimationKeyframe[],
    progress: number,
  ): AnimationKeyframe {
    if (keyframes.length === 0)
      return { time: 0, properties: {}, easing: "linear" };
    if (keyframes.length === 1) return keyframes[0];

    // Find surrounding keyframes
    let startFrame = keyframes[0];
    let endFrame = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (
        keyframes[i].time <= progress * 100 &&
        progress * 100 <= keyframes[i + 1].time
      ) {
        startFrame = keyframes[i];
        endFrame = keyframes[i + 1];
        break;
      }
    }

    // Interpolate between frames
    const frameProgress =
      (progress * 100 - startFrame.time) / (endFrame.time - startFrame.time);
    const easeProgress = this.easeValue(frameProgress, startFrame.easing);

    const interpolated: AnimationKeyframe = {
      time: progress * 100,
      properties: {},
      easing: startFrame.easing,
    };

    // Interpolate each property
    const allKeys = new Set([
      ...Object.keys(startFrame.properties),
      ...Object.keys(endFrame.properties),
    ]);

    allKeys.forEach((key) => {
      const start = (startFrame.properties as any)[key] || 0;
      const end = (endFrame.properties as any)[key] || 0;
      (interpolated.properties as any)[key] =
        start + (end - start) * easeProgress;
    });

    return interpolated;
  }

  private easeValue(value: number, easing: EasingType): number {
    switch (easing) {
      case "ease-in":
        return value * value;
      case "ease-out":
        return value * (2 - value);
      case "ease-in-out":
        return value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value;
      case "linear":
        return value;
      case "cubic-bezier":
        return value * value * value;
      default:
        return value;
    }
  }

  // ===== INTERACTION FLOWS =====

  startRecording(startElementId: string): void {
    this.recordingMode = true;
    this.recordedPath = [
      { elementId: startElementId, action: "navigate", timestamp: 0 },
    ];
    this.emit("recording-started", startElementId);
  }

  recordAction(elementId: string, action: ActionType): void {
    if (!this.recordingMode) return;
    this.recordedPath.push({
      elementId,
      action,
      timestamp: Date.now(),
    });
    this.emit("action-recorded", { elementId, action });
  }

  stopRecording(name: string): InteractionFlow | null {
    if (!this.recordingMode) return null;

    this.recordingMode = false;
    const flow: InteractionFlow = {
      id: nanoid(),
      name,
      startElement: this.recordedPath[0]?.elementId || "",
      interactions: [],
      flowPath: this.recordedPath.map((p) => ({
        elementId: p.elementId,
        action: p.action,
      })),
    };

    this.flows.set(flow.id, flow);
    this.saveToStorage();
    this.emit("flow-recorded", flow);
    return flow;
  }

  getFlows(): InteractionFlow[] {
    return Array.from(this.flows.values());
  }

  // ===== SIMULATION =====

  simulateClick(elementId: string): void {
    const interactions = this.getInteractionsByElement(elementId).filter(
      (i) => i.trigger === "click",
    );
    interactions.forEach((interaction) => {
      this.executeInteraction(interaction);
    });
  }

  simulateHover(elementId: string): void {
    const interactions = this.getInteractionsByElement(elementId).filter(
      (i) => i.trigger === "hover",
    );
    interactions.forEach((interaction) => {
      this.executeInteraction(interaction);
    });
  }

  private executeInteraction(interaction: Interaction): void {
    if (!interaction.enabled) return;

    // Check condition
    if (interaction.condition) {
      try {
        if (!Function(interaction.condition)()) return;
      } catch (error) {
        console.error("Condition evaluation failed:", error);
      }
    }

    switch (interaction.action) {
      case "navigate":
        if (interaction.targetScreen) {
          this.emit("navigate", {
            screen: interaction.targetScreen,
            preserveScroll: interaction.preserveScroll,
          });
        }
        break;

      case "animate":
        if (interaction.animation && interaction.sourceElement) {
          this.playAnimation(interaction.sourceElement, "", () => {
            this.emit("animation-complete", interaction.sourceElement);
          });
        }
        break;

      case "toggle-visibility":
        if (interaction.toggleElements) {
          interaction.toggleElements.forEach((elementId) => {
            this.emit("toggle-visibility", elementId);
          });
        }
        break;

      case "custom":
        if (interaction.customCode) {
          try {
            Function(interaction.customCode)();
          } catch (error) {
            console.error("Custom code execution failed:", error);
          }
        }
        break;
    }
  }

  // ===== PROTOTYPE MODE =====

  getPrototypeData() {
    return {
      interactions: Array.from(this.interactions.values()).filter(
        (i) => i.enabled,
      ),
      animations: Array.from(this.animationSequences.values()),
      flows: Array.from(this.flows.values()),
    };
  }

  // ===== STORAGE =====

  private saveToStorage(): void {
    localStorage.setItem(
      "interactions",
      JSON.stringify(Array.from(this.interactions.values())),
    );
    localStorage.setItem(
      "animations",
      JSON.stringify(Array.from(this.animationSequences.values())),
    );
    localStorage.setItem(
      "flows",
      JSON.stringify(Array.from(this.flows.values())),
    );
  }

  private loadFromStorage(): void {
    try {
      const interactions = localStorage.getItem("interactions");
      if (interactions) {
        JSON.parse(interactions).forEach((i: Interaction) => {
          this.interactions.set(i.id, {
            ...i,
            created: new Date(i.created),
            modified: new Date(i.modified),
          });
        });
      }

      const animations = localStorage.getItem("animations");
      if (animations) {
        JSON.parse(animations).forEach((a: AnimationSequence) => {
          this.animationSequences.set(a.id, {
            ...a,
            created: new Date(a.created),
            modified: new Date(a.modified),
          });
        });
      }

      const flows = localStorage.getItem("flows");
      if (flows) {
        JSON.parse(flows).forEach((f: InteractionFlow) => {
          this.flows.set(f.id, f);
        });
      }
    } catch (error) {
      console.error("Failed to load interaction data:", error);
    }
  }

  // ===== EVENTS =====

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

export const interactionEngine = new InteractionEngine();

import { EchoAi3Core } from "./EchoAi3Core";

export type PersonaMode = "Chef" | "Architect" | "Oracle";

export interface PersonaProfile {
  mode: PersonaMode;
  displayName: string;
  tone: string;
  color: string;
  avatar?: string;
  behavior: {
    empathy: number;
    logic: number;
    caution: number;
  };
}

const STORAGE_KEY = "echo.ai3.persona";

export const PersonaPresets: Record<PersonaMode, PersonaProfile> = {
  Chef: {
    mode: "Chef",
    displayName: "Echo // Chef",
    tone: "Warm, sensory, creative",
    color: "#ffb347",
    avatar:
      "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F23f93a6c6b344827870de1fbd51548a3?format=webp&width=800",
    behavior: { empathy: 0.9, logic: 0.6, caution: 0.5 },
  },
  Architect: {
    mode: "Architect",
    displayName: "Stratus // Architect",
    tone: "Strategic, analytical, precise",
    color: "#00ffff",
    avatar:
      "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F5aacef726c4a470bb9347a7789b46549?format=webp&width=800",
    behavior: { empathy: 0.5, logic: 0.9, caution: 0.8 },
  },
  Oracle: {
    mode: "Oracle",
    displayName: "Argus // Oracle",
    tone: "Calm, meta-analytic, cross-dimensional",
    color: "#b388ff",
    avatar:
      "https://cdn.builder.io/api/v1/image/assets%2F8b8d61942d1d4680bbfcbe7aa6b127f4%2F9787d55ee22a4855a2cc89f791841713?format=webp&width=800",
    behavior: { empathy: 0.7, logic: 0.8, caution: 0.9 },
  },
};

export class EchoPersonas {
  private static instance: EchoPersonas | null = null;
  private current: PersonaProfile = PersonaPresets.Chef;
  private readonly core = EchoAi3Core.getInstance();

  private constructor() {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && stored in PersonaPresets) {
      this.current = PersonaPresets[stored as PersonaMode];
    }
  }

  static getInstance() {
    if (!EchoPersonas.instance) {
      EchoPersonas.instance = new EchoPersonas();
    }
    return EchoPersonas.instance;
  }

  list() {
    return Object.values(PersonaPresets);
  }

  setPersona(mode: PersonaMode) {
    const profile = PersonaPresets[mode];
    if (!profile || profile.mode === this.current.mode) {
      return this.current;
    }
    this.current = profile;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
      // eslint-disable-next-line no-console
      console.log(`%c[EchoAi³] Persona set to ${mode}`, `color:${profile.color}`);
    }
    this.core.broadcast("Echo", "personaChange", profile);
    return profile;
  }

  getPersona() {
    return this.current;
  }

  adaptToContext(topic: string) {
    const key = topic.toLowerCase();
    if (key.includes("finance") || key.includes("budget")) {
      return this.setPersona("Architect");
    }
    if (key.includes("forecast") || key.includes("insight")) {
      return this.setPersona("Oracle");
    }
    return this.setPersona("Chef");
  }
}

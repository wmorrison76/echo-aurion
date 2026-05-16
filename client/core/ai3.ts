/**
 * EchoAI v3 Core System
 * Global initialization and management for the sentient AI assistant
 */

interface PersonaConfig {
  name: string;
  description: string;
  color: string;
}

const defaultPersona: PersonaConfig = {
  name: "EchoAI-Sentient",
  description: "Your helpful culinary operations assistant",
  color: "hsl(217, 91%, 60%)",
};

let isInitialized = false;
let currentPersona = defaultPersona;

const personasApi = {
  getPersona: () => currentPersona,
  setPersona: (persona: PersonaConfig) => {
    currentPersona = persona;
  },
};

export function initializeEchoAi3System() {
  isInitialized = true;
  console.log("[EchoAI3] System initialized");

  return {
    personas: personasApi,
    isInitialized: true,
  };
}

export function getEchoAi3Status() {
  return { initialized: isInitialized };
}

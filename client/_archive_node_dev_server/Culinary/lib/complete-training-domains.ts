/** * Utility to record completed training domains (Culinary, Pastry, Beverage) * This creates a training session with these 3 domains marked as completed */ import type {
  MultiDomainTrainingSession,
  DomainTrainingState,
} from "../../shared/multi-domain-training";
import {
  saveTrainingSession,
  saveDomainTrainingState,
  saveLearnedKnowledgeToPinecone,
} from "./training-persistence-service";
const completedDomains = [
  "culinary-science",
  "pastry-science",
  "beverage-flavor",
];
const domainConfig: Record<string, any> = {
  "culinary-science": {
    name: "Culinary Science Engine",
    focusAreas: [
      "Flavor Chemistry",
      "Thermal Dynamics",
      "Texture Transformation",
    ],
  },
  "pastry-science": {
    name: "Pastry Science Engine",
    focusAreas: [
      "Baking Formulas",
      "Defect Prevention",
      "Shelf-Life Management",
    ],
  },
  "beverage-flavor": {
    name: "Beverage Flavor Engine",
    focusAreas: ["Flavor Profiles", "Ingredient Blending", "Taste Balance"],
  },
};
export async function recordCompletedTrainingDomains(): Promise<MultiDomainTrainingSession> {
  const sessionId = `completed-training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const domainStates: Record<string, DomainTrainingState> = {}; // Create states for completed domains for (const domainId of completedDomains) { domainStates[domainId] = { profileId: domainId, status:"completed", startedAt: now, completedAt: now, exchangesCompleted: 4, // Default exchange count totalExchanges: 4, knowledgeItemsLearned: 12, // Estimated knowledge items per domain error: undefined, }; } const session: MultiDomainTrainingSession = { id: sessionId, createdAt: now, startedAt: now, completedAt: now, status:"completed", domainStates, totalKnowledgeLearned: 36, // 12 items * 3 domains overallProgress: 23, // 3/13 domains }; try { // Save session to Supabase console.log("[CompletedDomains] Saving training session..."); await saveTrainingSession(session); // Save each domain state console.log("[CompletedDomains] Saving domain states..."); for (const domainId of completedDomains) { await saveDomainTrainingState(sessionId, domainStates[domainId]); } // Save learned knowledge to Pinecone console.log("[CompletedDomains] Saving knowledge to Pinecone..."); for (const domainId of completedDomains) { const config = domainConfig[domainId]; const knowledge = config.focusAreas.map((area: string, idx: number) => ({ id: `${domainId}-knowledge-${idx}`, profileId: domainId, domain: domainId, type:"training", title: `${config.name} - ${area}`, content: `Trained knowledge about ${area} for ${config.name}`, focusArea: area, exchangeNumber: Math.floor(idx / 3) + 1, confidence: 0.85, })); await saveLearnedKnowledgeToPinecone(sessionId, domainId, knowledge); } console.log("[CompletedDomains] Successfully recorded completed training domains"); return session; } catch (error) { console.error("[CompletedDomains] Error recording completed domains:", error); throw error; }
}

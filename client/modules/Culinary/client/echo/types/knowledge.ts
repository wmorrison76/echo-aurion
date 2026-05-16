export type KnowledgeType =
  | "recipe"
  | "technique"
  | "terminology"
  | "financial"
  | "hospitality"
  | "beverage"
  | "plating"
  | "safety";

export interface BaseKnowledge {
  id: string;
  type: KnowledgeType;
  title: string;
  description: string;
  content: string;
  source?: string;
  sourceType: "openai" | "user_imported" | "user_trained";
  tags: string[];
  domain: "culinary" | "finance" | "hospitality" | "beverage" | "safety";
  createdAt: string;
  updatedAt: string;
  confidence?: number;
  relatedKnowledge?: string[];
}

export interface RecipeKnowledge extends BaseKnowledge {
  type: "recipe";
  ingredients: string[];
  instructions: string[];
  cuisine?: string;
  course?: string;
  complexity?: 1 | 2 | 3 | 4 | 5;
  prepTime?: number;
  cookTime?: number;
  yield?: string;
  techniques?: string[];
  flavorProfile?: string[];
}

export interface TechniqueKnowledge extends BaseKnowledge {
  type: "technique";
  steps: string[];
  equipment?: string[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  applications?: string[];
  tips?: string[];
}

export interface TerminologyKnowledge extends BaseKnowledge {
  type: "terminology";
  definition: string;
  etymology?: string;
  context?: string;
  synonyms?: string[];
  antonyms?: string[];
  examples?: string[];
}

export interface FinancialKnowledge extends BaseKnowledge {
  type: "financial";
  category: "cost_analysis" | "pricing" | "food_cost" | "margin" | "budgeting";
  metrics?: Record<string, number | string>;
  calculations?: string[];
  benchmarks?: Record<string, any>;
}

export interface HospitalityKnowledge extends BaseKnowledge {
  type: "hospitality";
  category: "service" | "beo" | "banquet" | "etiquette" | "management";
  guidelines?: string[];
  bestPractices?: string[];
  commonMistakes?: string[];
}

export interface BeverageKnowledge extends BaseKnowledge {
  type: "beverage";
  category: "cocktail" | "wine" | "beer" | "spirits" | "non_alcoholic";
  ingredients?: string[];
  pairing?: string[];
  preparation?: string;
}

export interface SafetyKnowledge extends BaseKnowledge {
  type: "safety";
  category: "food_safety" | "allergen" | "sanitation" | "handling";
  hazards?: string[];
  preventions?: string[];
  regulations?: string[];
}

export type AnyKnowledge =
  | RecipeKnowledge
  | TechniqueKnowledge
  | TerminologyKnowledge
  | FinancialKnowledge
  | HospitalityKnowledge
  | BeverageKnowledge
  | SafetyKnowledge;

export interface KnowledgeSearchResult {
  knowledge: AnyKnowledge;
  similarity: number;
  context?: string;
}

export interface EchoOpenAIDialogue {
  id: string;
  createdAt: string;
  updatedAt: string;
  topic: string;
  domain: string;
  messages: DialogueMessage[];
  status: "active" | "completed" | "paused";
  trainedKnowledge: string[];
  summary?: string;
}

export interface DialogueMessage {
  id: string;
  timestamp: string;
  speaker: "echo" | "openai" | "system";
  content: string;
  messageType:
    | "question"
    | "answer"
    | "suggestion"
    | "correction"
    | "confirmation";
  knowledgeGaps?: string[];
  proposedLearning?: {
    type: KnowledgeType;
    title: string;
    content: string;
  };
}

export interface TrainingSession {
  id: string;
  createdAt: string;
  domain: string;
  focusAreas: string[];
  dialogues: string[];
  completedKnowledge: AnyKnowledge[];
  stats: {
    questionsAsked: number;
    knowledgeAcquired: number;
    gapsIdentified: number;
    gapsFilled: number;
  };
}

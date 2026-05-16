// Presentation and Interview Types

export interface Slide {
  id: string;
  title: string;
  content: string;
  narration?: {
    audioBlob?: Blob;
    audioUrl?: string;
    duration: number; // seconds
    transcript?: string;
  };
  shapes: Shape[];
  backgroundColor?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Shape {
  id: string;
  type: "rect" | "circle" | "line" | "text" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  imageUrl?: string;
  rotation?: number;
}

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  slides: Slide[];
  currentSlideIndex: number;
  mode: "edit" | "presenting" | "playback";
  isRecording: boolean;
  createdAt: number;
  updatedAt: number;
  downloadFormats?: Array<"pdf" | "mp4" | "pptx" | "json">;
  subscriptionTier?: SubscriptionTier["level"];
}

export interface CVData {
  id: string;
  candidateName: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  rawText?: string;
  uploadedAt: number;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface Education {
  institution: string;
  degree: string;
  field?: string;
  graduationYear?: string;
}

export interface InterviewSession {
  id: string;
  candidateName: string;
  cvData: CVData;
  videoRoomId: string;
  startTime: number;
  endTime?: number;
  notes: InterviewNote[];
  generatedQuestions: GeneratedQuestion[];
  recordingUrl?: string;
  status: "scheduled" | "in_progress" | "completed";
  subscriptionTier?: SubscriptionTier["level"];
}

export interface InterviewNote {
  id: string;
  timestamp: number;
  content: string;
  linkedQuestionId?: string;
  aiGenerated?: boolean;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  source: "cv" | "conversation"; // CV-based or conversation-based
  relevantCVSection?: string;
  askedAt?: number;
  answer?: string;
  answerTimestamp?: number;
}

export interface PresentationExportOptions {
  format: "pdf" | "mp4" | "pptx" | "json";
  includeNarration: boolean;
  quality?: "low" | "medium" | "high";
  fileName: string;
}

export interface SubscriptionTier {
  level: "basic" | "pro" | "enterprise";
  features: {
    maxSlidesPerPresentation: number;
    maxPresentationDuration: number; // minutes
    exportFormats: Array<"pdf" | "mp4" | "pptx" | "json">;
    interviewParticipants: number;
    aiQuestionGeneration: boolean;
    liveTranslation: boolean;
    customBranding: boolean;
  };
}

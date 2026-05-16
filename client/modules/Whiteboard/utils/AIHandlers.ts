import { CVData, GeneratedQuestion } from "../types/PresentationTypes";
const API_URL =
  "https://api.openai.com/v1/chat/completions"; /** * Get OpenAI API key - lazy loading to avoid process.env at module load time */
function getOpenAIKey(): string {
  // Try multiple ways to get the API key (handles both client and server contexts) const key = typeof process !=="undefined" && process.env?.ECHO_OPENAI_API_KEY ? process.env.ECHO_OPENAI_API_KEY : (window as any).__ECHO_OPENAI_KEY ||""; if (!key) { throw new Error("OpenAI API key not configured. Set ECHO_OPENAI_API_KEY environment variable."); } return key;
} /** * Parse CV text using OpenAI to extract structured data */
export async function parseCV(cvText: string): Promise<Partial<CVData>> {
  try {
    const OPENAI_API_KEY = getOpenAIKey();
    const prompt = `Extract the following from this CV/Resume and return as JSON: - candidateName (string) - email (string or null) - phone (string or null) - summary (string, first 200 chars) - experience (array of {company, position, startDate, endDate, description}) - education (array of {institution, degree, field, graduationYear}) - skills (array of strings) CV Text: ${cvText} Return ONLY valid JSON, no other text.`;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("CV parsing failed:", error);
    throw error;
  }
} /** * Generate interview questions from CV */
export async function generateInterviewQuestions(
  cvData: CVData,
): Promise<GeneratedQuestion[]> {
  try {
    const OPENAI_API_KEY = getOpenAIKey();
    const cvSummary = `
Candidate: ${cvData.candidateName}
Experience: ${cvData.experience.map((e) => `${e.position} at ${e.company}`).join(",")}
Education: ${cvData.education.map((e) => `${e.degree} in ${e.field}`).join(",")}
Skills: ${cvData.skills.join(",")} `;
    const prompt = `Generate 5 professional interview questions for a hospitality industry role based on this CV:
${cvSummary} Return as JSON array of objects with: {text: string, relevantCVSection: string}
Return ONLY valid JSON, no other text.`;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    const questions = JSON.parse(content);
    return questions.map((q: any) => ({
      id: Math.random().toString(36).substring(7),
      text: q.text,
      source: "cv" as const,
      relevantCVSection: q.relevantCVSection,
    }));
  } catch (error) {
    console.error("Question generation failed:", error);
    throw error;
  }
} /** * Generate follow-up questions based on interview transcript */
export async function generateFollowUpQuestions(
  transcript: string,
  cvData: CVData,
): Promise<GeneratedQuestion[]> {
  try {
    const OPENAI_API_KEY = getOpenAIKey();
    const prompt = `Based on this interview transcript and candidate CV, generate 3 follow-up questions: CV: ${cvData.candidateName} - ${cvData.skills.join(",")} Transcript:
${transcript} Return as JSON array with: {text: string, context: string}
Return ONLY valid JSON, no other text.`;
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }
    const questions = JSON.parse(content);
    return questions.map((q: any) => ({
      id: Math.random().toString(36).substring(7),
      text: q.text,
      source: "conversation" as const,
    }));
  } catch (error) {
    console.error("Follow-up generation failed:", error);
    throw error;
  }
} /** * Transcribe audio using OpenAI Whisper */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const OPENAI_API_KEY = getOpenAIKey();
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", "whisper-1");
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      },
    );
    if (!response.ok) {
      throw new Error(`OpenAI Whisper error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Audio transcription failed:", error);
    throw error;
  }
}

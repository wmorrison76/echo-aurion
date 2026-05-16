import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.ECHO_OPENAI_API_KEY,
});

interface TeachingSession {
  topic: string;
  userExpertiseLevel: "beginner" | "intermediate" | "advanced";
  learningStyle: "visual" | "textual" | "interactive";
  duration: number; // minutes
}

interface TeachingStep {
  stepNumber: number;
  title: string;
  content: string;
  visualization?: {
    type: "diagram" | "highlight" | "overlay" | "animation";
    targetElement?: string;
    description: string;
  };
  question?: {
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  };
  nextAction: "continue" | "quiz" | "pause" | "interactive";
}

interface TeachingPlan {
  topic: string;
  objective: string;
  estimatedDuration: number;
  steps: TeachingStep[];
  checkpoints: number[]; // Step numbers where understanding is checked
  resources: string[]; // Links to additional resources
}

/**
 * EchoAI Teaching Mode Service
 * Screen takeover mode for educational explanations
 * Teacher persona explains complex systems interactively
 */
export class EchoTeachingModeService {
  /**
   * Start an interactive teaching session
   */
  async createTeachingPlan(
    topic: string,
    session: TeachingSession,
  ): Promise<TeachingPlan> {
    try {
      console.log(`📚 Creating teaching plan for: ${topic}`);

      const prompt = `You are an expert educator. Create a detailed teaching plan for the following:

Topic: ${topic}
User Level: ${session.userExpertiseLevel}
Learning Style: ${session.learningStyle}
Available Time: ${session.duration} minutes

Create a structured plan with 5-8 steps that progressively builds understanding.
Each step should have:
- Clear title
- Concise explanation (2-3 sentences)
- Visual guidance (what to highlight/show on screen)
- A checking question to verify understanding

Return as JSON:
{
  "objective": "what student will understand",
  "estimatedDuration": number,
  "steps": [{
    "stepNumber": number,
    "title": "step title",
    "content": "explanation",
    "visualization": {
      "type": "diagram|highlight|overlay|animation",
      "description": "what to show"
    },
    "question": {
      "text": "understanding check",
      "options": ["a", "b", "c"],
      "correctAnswer": "a",
      "explanation": "why this is correct"
    }
  }],
  "checkpoints": [numbers of steps to verify],
  "resources": ["links or references"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content || "{}";
      const planData = JSON.parse(content);

      return {
        topic,
        objective: planData.objective || "Understand the topic",
        estimatedDuration: planData.estimatedDuration || session.duration,
        steps: planData.steps || [],
        checkpoints: planData.checkpoints || [],
        resources: planData.resources || [],
      };
    } catch (error) {
      console.error("Error creating teaching plan:", error);
      throw error;
    }
  }

  /**
   * Generate detailed explanation for a concept
   */
  async explainConcept(
    concept: string,
    userLevel: "beginner" | "intermediate" | "advanced",
    context?: string,
  ): Promise<{
    explanation: string;
    analogy: string;
    keyPoints: string[];
    commonMisunderstandings: string[];
    relatedConcepts: string[];
    howToTeach: string; // How to explain this on screen
  }> {
    try {
      const prompt = `Explain this concept for a ${userLevel} level learner:

Concept: ${concept}
${context ? `Context: ${context}` : ""}

Provide:
1. Clear, ${userLevel === "beginner" ? "simple" : userLevel === "intermediate" ? "moderate complexity" : "advanced"} explanation
2. An analogy or real-world example
3. 3-5 key points to remember
4. Common misconceptions people have
5. Related concepts to explore next
6. How to teach this visually on screen (what to highlight, animate, or overlay)

Return as JSON:
{
  "explanation": "full explanation",
  "analogy": "real world comparison",
  "keyPoints": ["point1", "point2"],
  "commonMisunderstandings": ["myth1", "myth2"],
  "relatedConcepts": ["concept1", "concept2"],
  "howToTeach": "visual teaching approach"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error explaining concept:", error);
      throw error;
    }
  }

  /**
   * Generate adaptive follow-up based on user response
   */
  async generateFollowUp(
    topic: string,
    previousQuestion: string,
    userAnswer: string,
    isCorrect: boolean,
  ): Promise<{
    feedback: string;
    nextStep: string;
    reinforcement?: string; // Extra explanation if wrong
    difficulty: "easier" | "same" | "harder"; // Adapt difficulty
  }> {
    try {
      const prompt = `You are a patient teacher providing adaptive feedback.

Topic: ${topic}
Question Asked: ${previousQuestion}
Student Answer: ${userAnswer}
Correct Answer: ${isCorrect ? "Yes" : "No"}

Provide:
1. Immediate feedback (encouraging, specific)
2. Next step in learning
${!isCorrect ? "3. Gentle reinforcement of the correct concept" : ""}
4. Difficulty adjustment (easier/same/harder)

Return JSON:
{
  "feedback": "your response",
  "nextStep": "what to cover next",
  "reinforcement": "extra explanation if needed",
  "difficulty": "easier|same|harder"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error generating follow-up:", error);
      throw error;
    }
  }

  /**
   * Create interactive quiz for a topic
   */
  async createQuiz(
    topic: string,
    numberOfQuestions: number = 5,
    difficulty: "easy" | "medium" | "hard" = "medium",
  ): Promise<
    Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      difficulty: string;
    }>
  > {
    try {
      const prompt = `Create ${numberOfQuestions} ${difficulty} quiz questions about: ${topic}

Requirements:
- Multiple choice with 4 options
- One clearly correct answer
- Explanation for the correct answer
- Test understanding, not just memory

Return as JSON array:
[{
  "question": "question text",
  "options": ["a", "b", "c", "d"],
  "correctAnswer": 0,
  "explanation": "why this is correct",
  "difficulty": "${difficulty}"
}]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content || "[]";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error creating quiz:", error);
      return [];
    }
  }

  /**
   * Generate teaching tips for a specific audience
   */
  async getTeachingTips(
    topic: string,
    audience: string,
    painPoint?: string,
  ): Promise<{
    tips: string[];
    avoidCommonMistakes: string[];
    engagementStrategies: string[];
    checkForUnderstanding: string[];
  }> {
    try {
      const prompt = `You are an expert educator. Provide teaching tips for:

Topic: ${topic}
Audience: ${audience}
${painPoint ? `Common Challenge: ${painPoint}` : ""}

Provide:
1. 5 practical tips for teaching this effectively
2. Common mistakes to avoid
3. Engagement strategies to keep attention
4. How to check if students truly understand

Return JSON:
{
  "tips": ["tip1", "tip2"],
  "avoidCommonMistakes": ["mistake1"],
  "engagementStrategies": ["strategy1"],
  "checkForUnderstanding": ["method1"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error generating teaching tips:", error);
      throw error;
    }
  }

  /**
   * Create step-by-step tutorial with screen highlights
   */
  async createTutorial(
    systemComponent: string,
    userGoal: string,
  ): Promise<{
    steps: Array<{
      stepNumber: number;
      action: string;
      highlight: { elementSelector: string; message: string };
      verification: string;
      alternativeApproach?: string;
    }>;
    estimatedTime: number;
    commonIssues: Array<{ issue: string; solution: string }>;
  }> {
    try {
      const prompt = `Create a step-by-step tutorial with screen highlights.

Component: ${systemComponent}
User Goal: ${userGoal}

For each step provide:
- Clear action to take
- What element to highlight on screen
- How to verify success
- Alternative approach if available

Return JSON:
{
  "steps": [{
    "stepNumber": 1,
    "action": "what to do",
    "highlight": {
      "elementSelector": "css selector or id",
      "message": "explanation of why to click here"
    },
    "verification": "how user knows they succeeded",
    "alternativeApproach": "if applicable"
  }],
  "estimatedTime": 15,
  "commonIssues": [{
    "issue": "problem",
    "solution": "fix"
  }]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content);
    } catch (error) {
      console.error("Error creating tutorial:", error);
      throw error;
    }
  }

  /**
   * Assess student understanding
   */
  async assessUnderstanding(
    topic: string,
    studentResponses: Array<{
      question: string;
      answer: string;
      isCorrect: boolean;
    }>,
  ): Promise<{
    overallScore: number; // 0-100
    strengths: string[];
    areasToImprove: string[];
    recommendations: string[];
    readyForAdvanced: boolean;
  }> {
    try {
      const prompt = `Assess student understanding based on quiz responses.

Topic: ${topic}
Responses: ${JSON.stringify(studentResponses)}

Provide:
1. Overall score (0-100)
2. What they understand well
3. What needs more practice
4. Specific recommendations
5. Whether they're ready for advanced content

Return JSON:
{
  "overallScore": 75,
  "strengths": ["strength1"],
  "areasToImprove": ["area1"],
  "recommendations": ["rec1"],
  "readyForAdvanced": true/false
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "{}";
      const assessment = JSON.parse(content);
      return {
        overallScore: assessment.overallScore || 0,
        strengths: assessment.strengths || [],
        areasToImprove: assessment.areasToImprove || [],
        recommendations: assessment.recommendations || [],
        readyForAdvanced: assessment.readyForAdvanced || false,
      };
    } catch (error) {
      console.error("Error assessing understanding:", error);
      throw error;
    }
  }
}

export const echoTeachingModeService = new EchoTeachingModeService();

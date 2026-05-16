// SECURITY: All OpenAI calls proxied through server-side endpoints
import { chatCompletion } from "./secureOpenAIService";
import { getWeatherService } from "@/services/weatherService";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DialogUnderstanding {
  coreIdea: string;
  targetUsers: string;
  mainProblem: string;
  keyFeatures: string[];
  dataEntities: string[];
  integrations: string[];
  constraints: string[];
  complexity: "simple" | "moderate" | "complex";
  completenessScore: number; // 0-100
  suggestedNextQuestions?: string[];
}

class RealAIConversationService {
  private conversationHistory: ConversationMessage[] = [];
  private currentUnderstanding: DialogUnderstanding | null = null;

  constructor() {
    // AI features available via secure /api/openai endpoints
  }

  async initializeConversation(): Promise<string> {
    const systemPrompt = this.getSystemPrompt();
    const initialMessage: ConversationMessage = {
      role: "assistant",
      content:
        "Hi! I'm here to help you build a complete system. To understand your vision perfectly, I'll ask clarifying questions. Tell me - what are you trying to create? Start with your core idea.",
    };

    this.conversationHistory = [initialMessage];
    return initialMessage.content;
  }

  async sendMessage(userMessage: string): Promise<{
    response: string;
    understanding: DialogUnderstanding;
    phase: "idea" | "understanding" | "planning" | "ready";
  }> {
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      // Check if user is asking about weather
      const weatherKeywords = [
        "weather",
        "temperature",
        "forecast",
        "rain",
        "sunny",
        "cloudy",
        "cold",
        "hot",
        "wind",
        "snow",
      ];
      const isWeatherQuestion = weatherKeywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword),
      );

      let aiResponse: string;

      if (isWeatherQuestion) {
        // Extract location from message - FIRST extract, THEN clean
        let location = "";

        // Pattern 1: Look for text after "in", "at", or "for" (BEFORE removing words)
        let match = userMessage.match(/(?:in|at|for)\s+([a-zA-Z\s]+?)(?:\s+(?:weather|forecast|tomorrow|today|tonight|now|currently)|[?.!]|$)/i);
        if (match) {
          location = match[1].trim();
        }

        // Pattern 2: If no location yet, look for capitalized city names (2+ words)
        if (!location) {
          match = userMessage.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
          if (match) {
            location = match[0].trim();
          }
        }

        // Pattern 3: Single capitalized word as fallback
        if (!location) {
          match = userMessage.match(/([A-Z][a-z]+)/);
          if (match) {
            location = match[0].trim();
          }
        }

        // Final fallback
        if (!location) {
          location = "current location";
        }

        try {
          const weatherService = getWeatherService();
          console.log("Cleaned location:", location, "from:", userMessage);

          const weather = await weatherService.getWeather(location);
          console.log("Weather data received:", weather);

          if (weather) {
            const weatherInfo = weatherService.formatWeatherForDisplay(weather);
            console.log("Formatted weather info:", weatherInfo);

            const weatherPrompt = `The user asked about weather: "${userMessage}"

Here is the actual current weather data for ${weather.location}:
${weatherInfo}

Provide a specific and helpful response about the weather using this actual data. Include temperature, conditions, humidity, and any relevant details for planning operations. Be concise and actionable.`;

            aiResponse = await this.callOpenAI(weatherPrompt);
          } else {
            console.log("No weather data returned for location:", location);
            aiResponse = await this.callOpenAI(userMessage);
          }
        } catch (weatherError) {
          // Fallback to normal response if weather fetch fails
          console.error("Weather fetch error:", weatherError);
          aiResponse = await this.callOpenAI(userMessage);
        }
      } else {
        // Get normal AI response
        aiResponse = await this.callOpenAI(userMessage);
      }

      // Add AI response to history
      this.conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      // Analyze conversation to build understanding
      const understanding = await this.analyzeConversation();
      this.currentUnderstanding = understanding;

      // Determine phase based on completeness
      const phase = this.determinePhase(understanding);

      return {
        response: aiResponse,
        understanding,
        phase,
      };
    } catch (error: any) {
      throw new Error(`AI conversation failed: ${error.message}`);
    }
  }

  private async callOpenAI(userMessage: string): Promise<string> {
    // SECURITY: All calls proxied through secure /api/openai endpoint
    const systemPrompt = this.getSystemPrompt();

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...this.conversationHistory.map((msg) => ({
        role: msg.role as const,
        content: msg.content,
      })),
    ];

    try {
      return await chatCompletion({
        messages: messages as any,
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 500,
      });
    } catch (error: any) {
      throw new Error(`AI conversation failed: ${error.message}`);
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert system architect and helpful assistant. You help developers build complete software systems AND answer general questions.

Your capabilities:
1. System Architecture: Ask clarifying questions to understand the user's vision for building systems
2. Weather Information: Use your knowledge to provide weather data and forecasts when asked
3. General Knowledge: Answer questions about technology, business, hospitality, events, and more
4. Code Generation: Help plan and generate code for complete systems

When the user asks about weather:
- Provide helpful weather information (current conditions, forecasts, etc.)
- For specific locations, you can help them understand weather patterns and impacts on events/operations
- Be conversational and helpful

When helping build a system:
1. Ask ONE or TWO focused questions at a time
2. Ask about target users, problems being solved, key features, data entities, and integrations
3. Build comprehensive understanding through conversation
4. When ready (completeness ~90%), confirm: "Perfect! I have a clear understanding now. I'm ready to build your complete system."

Be conversational, encouraging, and helpful across all topics.`;
  }

  private async analyzeConversation(): Promise<DialogUnderstanding> {
    // Use GPT-4 to analyze the conversation and extract structured understanding
    const analysisPrompt = `Based on this conversation history, extract a structured understanding of the system being built.

Conversation:
${this.conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

Return a JSON object with:
- coreIdea: string (the main idea)
- targetUsers: string (who will use this)
- mainProblem: string (what problem it solves)
- keyFeatures: string[] (main features to build)
- dataEntities: string[] (main data types/models needed)
- integrations: string[] (external services needed)
- constraints: string[] (limitations or requirements)
- complexity: "simple" | "moderate" | "complex"
- completenessScore: number (0-100, how complete is our understanding)
- suggestedNextQuestions: string[] (if completeness < 80, what else to ask)

Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4-turbo",
            messages: [
              {
                role: "user",
                content: analysisPrompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to analyze conversation");
      }

      const data = await response.json();
      const jsonStr = data.choices[0].message.content;

      // Parse the JSON response
      const analysis = JSON.parse(jsonStr);

      return {
        coreIdea: analysis.coreIdea || "",
        targetUsers: analysis.targetUsers || "",
        mainProblem: analysis.mainProblem || "",
        keyFeatures: analysis.keyFeatures || [],
        dataEntities: analysis.dataEntities || [],
        integrations: analysis.integrations || [],
        constraints: analysis.constraints || [],
        complexity: analysis.complexity || "moderate",
        completenessScore: analysis.completenessScore || 0,
        suggestedNextQuestions: analysis.suggestedNextQuestions || [],
      };
    } catch (error: any) {
      // If analysis fails, return partial understanding
      return {
        coreIdea: "System being defined",
        targetUsers: "",
        mainProblem: "",
        keyFeatures: [],
        dataEntities: [],
        integrations: [],
        constraints: [],
        complexity: "moderate",
        completenessScore: 30,
      };
    }
  }

  private determinePhase(
    understanding: DialogUnderstanding,
  ): "idea" | "understanding" | "planning" | "ready" {
    const score = understanding.completenessScore;

    if (score < 40) return "idea";
    if (score < 70) return "understanding";
    if (score < 90) return "planning";
    return "ready";
  }

  getCurrentUnderstanding(): DialogUnderstanding | null {
    return this.currentUnderstanding;
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  reset(): void {
    this.conversationHistory = [];
    this.currentUnderstanding = null;
  }
}

export const realAIConversationService = new RealAIConversationService();

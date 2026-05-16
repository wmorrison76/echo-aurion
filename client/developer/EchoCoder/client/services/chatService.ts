import axios from "axios";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  codeContext?: {
    file: string;
    line: number;
    code: string;
  };
}

interface ChatSession {
  id: string;
  messages: Message[];
  context: {
    currentFile?: string;
    selectedText?: string;
    recentErrors?: Array<{
      file: string;
      error: string;
      stack: string;
    }>;
  };
  createdAt: Date;
}

class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;
  private messageId = 0;

  async createSession(
    context?: Partial<ChatSession["context"]>,
  ): Promise<string> {
    const sessionId = `session-${Date.now()}`;
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      context: {
        currentFile: context?.currentFile,
        selectedText: context?.selectedText,
        recentErrors: context?.recentErrors,
      },
      createdAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;
    return sessionId;
  }

  async sendMessage(
    sessionId: string,
    userMessage: string,
    codeContext?: { file: string; line: number; code: string },
  ): Promise<Message> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const userMsg: Message = {
      id: `msg-${this.messageId++}`,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
      codeContext,
    };
    session.messages.push(userMsg);

    const response = await axios.post("/api/chat/message", {
      sessionId,
      message: userMessage,
      codeContext,
      context: session.context,
    });

    const assistantMsg: Message = {
      id: `msg-${this.messageId++}`,
      role: "assistant",
      content: response.data.response,
      timestamp: new Date(),
    };
    session.messages.push(assistantMsg);

    return assistantMsg;
  }

  async analyzeCode(
    sessionId: string,
    code: string,
    language: string = "typescript",
  ): Promise<{
    analysis: string;
    issues: Array<{ line: number; issue: string; severity: string }>;
  }> {
    const response = await axios.post("/api/chat/analyze-code", {
      sessionId,
      code,
      language,
    });
    return response.data;
  }

  async getSentryContext(
    sessionId: string,
    projectId?: string,
  ): Promise<{ errors: Array<any>; insights: string[] }> {
    try {
      // Try to get real Sentry data
      const response = await axios.get("/api/sentry/insights", {
        params: { projectId },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to get Sentry context:", error);
      // Fallback to chat API endpoint
      const response = await axios.get("/api/chat/sentry-context", {
        params: { sessionId, projectId },
      });
      return response.data;
    }
  }

  async suggestFixes(
    sessionId: string,
    errorMessage: string,
    stack?: string,
  ): Promise<{
    suggestions: Array<{
      fix: string;
      explanation: string;
      confidence: number;
    }>;
  }> {
    const response = await axios.post("/api/chat/suggest-fixes", {
      sessionId,
      errorMessage,
      stack,
    });
    return response.data;
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ChatSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  getCurrentSession(): ChatSession | null {
    return this.currentSessionId
      ? this.sessions.get(this.currentSessionId) || null
      : null;
  }
}

let chatService: ChatService | null = null;

export function getChatService(): ChatService {
  if (!chatService) {
    chatService = new ChatService();
  }
  return chatService;
}

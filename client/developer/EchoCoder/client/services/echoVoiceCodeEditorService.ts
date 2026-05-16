import { echoMultiPersonaService } from "./echoMultiPersonaService";

/**
 * Voice Command Type
 * Maps voice input to code actions
 */
type VoiceCommandType =
  | "fix"
  | "optimize"
  | "refactor"
  | "add_feature"
  | "add_test"
  | "add_documentation"
  | "explain"
  | "revert"
  | "undo"
  | "redo"
  | "search"
  | "navigate"
  | "generate";

interface VoiceCommand {
  type: VoiceCommandType;
  content: string;
  targetSelection?: string;
  confidence: number;
  suggestions?: string[];
}

interface CodeEditRequest {
  command: VoiceCommand;
  currentCode: string;
  selectedCode?: string;
  language: string;
}

interface CodeEditResult {
  originalCode: string;
  proposedCode: string;
  explanation: string;
  diff: Array<{
    line: number;
    type: "add" | "remove" | "modify";
    content: string;
  }>;
  requiresConfirmation: boolean;
  autoApply: boolean;
}

/**
 * EchoAI Voice-Enabled Code Editor Service
 * Processes voice commands to modify code in real-time
 * Works with Developer persona for code suggestions
 */
export class EchoVoiceCodeEditorService {
  private commandHistory: VoiceCommand[] = [];
  private editHistory: CodeEditResult[] = [];
  private confirmationRequired: boolean = true;

  /**
   * Parse voice transcript into a voice command
   */
  async parseVoiceCommand(transcript: string): Promise<VoiceCommand> {
    const lowerTranscript = transcript.toLowerCase();

    // Determine command type from voice input
    let type: VoiceCommandType = "generate";
    if (lowerTranscript.includes("fix")) type = "fix";
    else if (lowerTranscript.includes("optimize")) type = "optimize";
    else if (lowerTranscript.includes("refactor")) type = "refactor";
    else if (lowerTranscript.includes("add feature")) type = "add_feature";
    else if (lowerTranscript.includes("test")) type = "add_test";
    else if (lowerTranscript.includes("document")) type = "add_documentation";
    else if (lowerTranscript.includes("explain")) type = "explain";
    else if (lowerTranscript.includes("undo")) type = "undo";
    else if (lowerTranscript.includes("redo")) type = "redo";
    else if (lowerTranscript.includes("revert")) type = "revert";
    else if (lowerTranscript.includes("search")) type = "search";

    // Extract the actual instruction (remove command verb)
    const content = this.extractInstructionContent(transcript, type);

    // Generate suggestions based on command type
    const suggestions = this.generateSuggestions(type, content);

    const command: VoiceCommand = {
      type,
      content,
      confidence: 0.85, // Base confidence for voice-derived commands
      suggestions,
    };

    // Store in history
    this.commandHistory.push(command);

    return command;
  }

  /**
   * Extract the actual instruction content from transcript
   */
  private extractInstructionContent(
    transcript: string,
    commandType: VoiceCommandType,
  ): string {
    const verbs: Record<VoiceCommandType, string[]> = {
      fix: ["fix", "repair", "correct", "debug", "resolve"],
      optimize: ["optimize", "improve", "speed up", "make faster"],
      refactor: ["refactor", "reorganize", "restructure", "clean up"],
      add_feature: ["add", "create", "implement", "build"],
      add_test: ["test", "add test", "write test"],
      add_documentation: ["document", "add docs", "add comments"],
      explain: ["explain", "what is", "describe"],
      revert: ["revert", "undo", "go back"],
      undo: ["undo"],
      redo: ["redo"],
      search: ["search", "find", "look for"],
      navigate: ["navigate", "go to", "open"],
      generate: ["generate", "create", "make"],
    };

    let content = transcript;
    const verbs_for_type = verbs[commandType] || [];

    for (const verb of verbs_for_type) {
      const regex = new RegExp(`\\b${verb}\\b\\s+`, "i");
      content = content.replace(regex, "").trim();
    }

    return content;
  }

  /**
   * Generate AI suggestions for voice command
   */
  private generateSuggestions(
    commandType: VoiceCommandType,
    content: string,
  ): string[] {
    const suggestions: Record<VoiceCommandType, string[]> = {
      fix: [
        "Add error handling",
        "Fix type errors",
        "Add null checks",
        "Improve error messages",
      ],
      optimize: [
        "Reduce complexity",
        "Cache results",
        "Parallel processing",
        "Remove loops",
      ],
      refactor: [
        "Extract function",
        "Remove duplication",
        "Simplify logic",
        "Rename variables",
      ],
      add_feature: [
        "Add validation",
        "Add loading state",
        "Add error handling",
        "Add logging",
      ],
      add_test: [
        "Add unit tests",
        "Add integration tests",
        "Add error cases",
        "Add happy path",
      ],
      add_documentation: [
        "Add JSDoc comments",
        "Add parameter docs",
        "Add return docs",
        "Add examples",
      ],
      explain: [
        "Explain the logic",
        "Explain the purpose",
        "Explain edge cases",
        "Explain dependencies",
      ],
      revert: ["Revert last change", "Revert to previous version"],
      undo: ["Undo last edit"],
      redo: ["Redo last undo"],
      search: ["Search in file", "Search in project", "Find references"],
      navigate: ["Go to definition", "Go to file", "Open component"],
      generate: [
        "Generate from description",
        "Generate test",
        "Generate documentation",
      ],
    };

    return suggestions[commandType] || [];
  }

  /**
   * Process voice command and generate code edit
   */
  async processVoiceEdit(request: CodeEditRequest): Promise<CodeEditResult> {
    try {
      console.log(`🎤 Processing voice command: ${request.command.type}`);

      // Handle special voice commands
      if (request.command.type === "undo") {
        return this.handleUndo();
      }
      if (request.command.type === "redo") {
        return this.handleRedo();
      }
      if (request.command.type === "revert") {
        return this.handleRevert();
      }

      // Process command with Developer persona
      const personaResponse = await echoMultiPersonaService.processQuery(
        `Voice command: ${request.command.type} - ${request.command.content}
        
Current code:
${request.selectedCode || request.currentCode.substring(0, 500)}

Language: ${request.language}

Respond with:
1. What you'll change and why
2. The exact modified code
3. Any important notes`,
        {
          file: request.language,
          selectedCode: request.selectedCode,
        },
      );

      // Parse the proposed change from AI response
      const proposedCode = this.extractCodeFromResponse(
        personaResponse.response,
      );

      // Generate diff
      const diff = this.generateDiff(
        request.selectedCode || request.currentCode,
        proposedCode,
      );

      const result: CodeEditResult = {
        originalCode: request.selectedCode || request.currentCode,
        proposedCode,
        explanation: personaResponse.response,
        diff,
        requiresConfirmation: this.confirmationRequired,
        autoApply:
          request.command.type === "undo" ||
          request.command.type === "redo" ||
          personaResponse.confidence > 0.9,
      };

      // Store in history
      this.editHistory.push(result);

      return result;
    } catch (error) {
      console.error("Error processing voice edit:", error);
      throw error;
    }
  }

  /**
   * Extract code block from AI response
   */
  private extractCodeFromResponse(response: string): string {
    // Look for code blocks
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/;
    const match = response.match(codeBlockRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // If no code block found, return original
    return response;
  }

  /**
   * Generate diff between original and proposed code
   */
  private generateDiff(
    original: string,
    proposed: string,
  ): Array<{
    line: number;
    type: "add" | "remove" | "modify";
    content: string;
  }> {
    const originalLines = original.split("\n");
    const proposedLines = proposed.split("\n");
    const diff = [];

    let lineNum = 1;

    for (
      let i = 0;
      i < Math.max(originalLines.length, proposedLines.length);
      i++
    ) {
      const origLine = originalLines[i] || "";
      const propLine = proposedLines[i] || "";

      if (origLine !== propLine) {
        if (!origLine) {
          diff.push({
            line: lineNum,
            type: "add",
            content: propLine,
          });
        } else if (!propLine) {
          diff.push({
            line: lineNum,
            type: "remove",
            content: origLine,
          });
        } else {
          diff.push({
            line: lineNum,
            type: "modify",
            content: propLine,
          });
        }
      }

      lineNum++;
    }

    return diff;
  }

  /**
   * Handle undo command
   */
  private handleUndo(): CodeEditResult {
    if (this.editHistory.length === 0) {
      throw new Error("Nothing to undo");
    }

    const lastEdit = this.editHistory[this.editHistory.length - 1];

    return {
      originalCode: lastEdit.proposedCode,
      proposedCode: lastEdit.originalCode,
      explanation: "Undoing last edit",
      diff: lastEdit.diff.map((d) => ({
        ...d,
        type:
          d.type === "add" ? "remove" : d.type === "remove" ? "add" : "modify",
      })),
      requiresConfirmation: false,
      autoApply: true,
    };
  }

  /**
   * Handle redo command
   */
  private handleRedo(): CodeEditResult {
    if (this.editHistory.length === 0) {
      throw new Error("Nothing to redo");
    }

    const lastEdit = this.editHistory[this.editHistory.length - 1];

    return {
      originalCode: lastEdit.originalCode,
      proposedCode: lastEdit.proposedCode,
      explanation: "Redoing last edit",
      diff: lastEdit.diff,
      requiresConfirmation: false,
      autoApply: true,
    };
  }

  /**
   * Handle revert command
   */
  private handleRevert(): CodeEditResult {
    this.editHistory = [];
    return {
      originalCode: "",
      proposedCode: "",
      explanation: "Reverted to original state",
      diff: [],
      requiresConfirmation: false,
      autoApply: true,
    };
  }

  /**
   * Apply code edit
   */
  async applyEdit(result: CodeEditResult, code: string): Promise<string> {
    // Apply diff to code
    let updatedCode = code;

    for (const change of result.diff.reverse()) {
      const lines = updatedCode.split("\n");

      if (change.type === "remove") {
        lines.splice(change.line - 1, 1);
      } else if (change.type === "add") {
        lines.splice(change.line - 1, 0, change.content);
      } else if (change.type === "modify") {
        lines[change.line - 1] = change.content;
      }

      updatedCode = lines.join("\n");
    }

    return updatedCode;
  }

  /**
   * Get edit history
   */
  getEditHistory(): CodeEditResult[] {
    return this.editHistory;
  }

  /**
   * Clear edit history
   */
  clearHistory(): void {
    this.editHistory = [];
    this.commandHistory = [];
  }

  /**
   * Set whether confirmation is required
   */
  setRequireConfirmation(required: boolean): void {
    this.confirmationRequired = required;
  }

  /**
   * Get command history
   */
  getCommandHistory(): VoiceCommand[] {
    return this.commandHistory;
  }
}

// Singleton export
export const echoVoiceCodeEditorService = new EchoVoiceCodeEditorService();

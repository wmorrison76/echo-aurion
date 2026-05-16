interface ConversionOptions {
  method: "json" | "description" | "image";
  input: string;
  outputFormats?: ("react" | "html" | "tailwind")[];
  componentScope?: "basic" | "advanced" | "full";
}

interface ConversionResult {
  success: boolean;
  code?: string | { react?: string; html?: string; tailwind?: string };
  format?: string;
  formats?: string[];
  source?: string;
  message?: string;
}

interface AnalysisResult {
  success: boolean;
  analysis?: {
    complexity: "simple" | "moderate" | "complex";
    components: number;
    estimatedTime: string;
    recommendations: string[];
  };
  message?: string;
}

class FigmaToCodeService {
  private readonly apiBaseUrl = "/api/figma-to-code";

  async convertFromJSON(
    jsonString: string,
    outputFormats: ("react" | "html" | "tailwind")[] = ["react"],
    componentScope: "basic" | "advanced" | "full" = "advanced",
  ): Promise<ConversionResult> {
    return this.makeRequest("convert-json", {
      method: "json",
      input: jsonString,
      outputFormats,
      componentScope,
    });
  }

  async convertFromDescription(
    description: string,
    outputFormats: ("react" | "html" | "tailwind")[] = ["react"],
    componentScope: "basic" | "advanced" | "full" = "advanced",
  ): Promise<ConversionResult> {
    return this.makeRequest("convert-description", {
      method: "description",
      input: description,
      outputFormats,
      componentScope,
    });
  }

  async convertFromImage(
    imageInput: string,
    outputFormats: ("react" | "html" | "tailwind")[] = ["react"],
    componentScope: "basic" | "advanced" | "full" = "advanced",
  ): Promise<ConversionResult> {
    return this.makeRequest("convert-image", {
      method: "image",
      input: imageInput,
      outputFormats,
      componentScope,
    });
  }

  async convertAllFormats(
    input: string,
    method: "json" | "description" | "image",
    componentScope: "basic" | "advanced" | "full" = "advanced",
  ): Promise<ConversionResult> {
    return this.makeRequest("convert-all-formats", {
      method,
      input,
      componentScope,
    });
  }

  async analyzeDesign(
    input: string,
    method: "json" | "description" | "image",
  ): Promise<AnalysisResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Figma analysis request timeout"), 60000);

    try {
      const response = await fetch(`${this.apiBaseUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ input, method }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.message || "Analysis failed",
        };
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return {
          success: false,
          message: "Analysis request timed out. Please try again.",
        };
      }
      return {
        success: false,
        message: error.message || "Analysis request failed",
      };
    }
  }

  private async makeRequest(
    endpoint: string,
    options: ConversionOptions,
  ): Promise<ConversionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Figma conversion request timeout"), 120000);

    try {
      const response = await fetch(`${this.apiBaseUrl}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(options),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          message: error.message || "Conversion failed",
        };
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        return {
          success: false,
          message: "Code generation timed out. Please try again.",
        };
      }
      return {
        success: false,
        message: error.message || "Conversion request failed",
      };
    }
  }
}

export const figmaToCodeService = new FigmaToCodeService();
export type { ConversionResult, AnalysisResult, ConversionOptions };

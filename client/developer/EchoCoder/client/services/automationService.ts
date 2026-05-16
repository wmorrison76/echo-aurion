/**
 * Automation Service
 * Handles calls to the automation analysis API
 */

class AutomationService {
  private baseUrl = "/api/automation";

  async prescanModules(code: string, moduleName: string) {
    return this.callAnalysis("prescan", { code, moduleName });
  }

  async securitySweep(code: string, moduleName: string) {
    return this.callAnalysis("security", { code, moduleName });
  }

  async generateIntentBrief(code: string, moduleName: string) {
    return this.callAnalysis("intent", { code, moduleName });
  }

  async dryRunSimulation(code: string, moduleName: string) {
    return this.callAnalysis("dryrun", { code, moduleName });
  }

  async deployToNetlify(code: string, moduleName: string) {
    return this.callAnalysis("deploy", { code, moduleName });
  }

  private async callAnalysis(
    analysisType: string,
    payload: { code: string; moduleName: string }
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("Analysis request timeout"), 60000); // 60s timeout

    try {
      const response = await fetch(`${this.baseUrl}/${analysisType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Analysis failed with status ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Analysis timeout - request took too long");
        }
        throw error;
      }
      throw new Error("Unknown error during analysis");
    }
  }
}

export const automationService = new AutomationService();

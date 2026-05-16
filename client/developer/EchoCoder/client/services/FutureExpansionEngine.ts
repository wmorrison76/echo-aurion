// SECURITY: API calls proxied through secure /api/openai endpoints
// The actual API key is stored server-side and NEVER exposed to client

export interface ExpansionScenario {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  useCases: string[];
  complexity: "simple" | "moderate" | "complex";
  estimatedTimeline: string;
}

export interface MobileExpansion {
  platforms: ("ios" | "android" | "web")[];
  framework: "react-native" | "flutter" | "swiftui" | "jetpack-compose";
  features: string[];
  offlineCapability: boolean;
}

export interface BlockchainExpansion {
  networks: ("ethereum" | "polygon" | "solana" | "xrp")[];
  smartContracts: boolean;
  nftSupport: boolean;
  paymentIntegration: boolean;
}

export interface IoTExpansion {
  protocols: ("mqtt" | "coap" | "http" | "websocket")[];
  devices: ("sensors" | "actuators" | "gateways" | "edge-devices")[];
  realTimeProcessing: boolean;
  dataAggregation: boolean;
}

class FutureExpansionEngine {
  /**
   * Analyze project for mobile expansion potential
   */
  async analyzeMobileExpansion(
    projectDescription: string,
  ): Promise<MobileExpansion | null> {
    try {
      const prompt = `
Analyze this project for mobile app expansion potential:

${projectDescription}

Recommend a mobile expansion strategy:
1. Target platforms (iOS, Android, Web)
2. Best framework choice (React Native, Flutter, SwiftUI, Jetpack Compose)
3. Key features to include
4. Offline-first capability needed?

Return JSON with: platforms, framework, features, offlineCapability
      `;

      const response = await this.callOpenAI(
        prompt,
        "You are an expert mobile app architect.",
      );

      return this.parseMobileExpansion(response);
    } catch (error) {
      console.error("Mobile expansion analysis error:", error);
      return this.getDefaultMobileExpansion();
    }
  }

  /**
   * Analyze project for blockchain integration
   */
  async analyzeBlockchainExpansion(
    projectDescription: string,
  ): Promise<BlockchainExpansion | null> {
    try {
      const prompt = `
Analyze this project for blockchain integration potential:

${projectDescription}

Recommend blockchain integration:
1. Which networks? (Ethereum, Polygon, Solana, XRP)
2. Smart contracts needed?
3. NFT integration potential?
4. Payment integration via blockchain?

Return JSON with: networks, smartContracts, nftSupport, paymentIntegration
      `;

      const response = await this.callOpenAI(
        prompt,
        "You are a blockchain technology expert.",
      );

      return this.parseBlockchainExpansion(response);
    } catch (error) {
      console.error("Blockchain expansion analysis error:", error);
      return this.getDefaultBlockchainExpansion();
    }
  }

  /**
   * Analyze project for IoT integration
   */
  async analyzeIoTExpansion(
    projectDescription: string,
  ): Promise<IoTExpansion | null> {
    try {
      const prompt = `
Analyze this project for IoT expansion potential:

${projectDescription}

Recommend IoT integration:
1. Protocols needed (MQTT, CoAP, HTTP, WebSocket)
2. Device types (Sensors, Actuators, Gateways, Edge devices)
3. Real-time processing requirements?
4. Data aggregation strategy?

Return JSON with: protocols, devices, realTimeProcessing, dataAggregation
      `;

      const response = await this.callOpenAI(
        prompt,
        "You are an IoT systems architect.",
      );

      return this.parseIoTExpansion(response);
    } catch (error) {
      console.error("IoT expansion analysis error:", error);
      return this.getDefaultIoTExpansion();
    }
  }

  /**
   * Get expansion roadmap for 2-3 years
   */
  async generateExpansionRoadmap(
    projectDescription: string,
  ): Promise<ExpansionScenario[]> {
    if (!this.apiKey) {
      return this.getDefaultRoadmap();
    }

    try {
      const prompt = `
Create a 2-3 year expansion roadmap for this project:

${projectDescription}

Suggest 5-7 expansion scenarios with:
1. What to build
2. Technologies required
3. Real-world use cases
4. Complexity (simple/moderate/complex)
5. Estimated timeline

Focus on practical, revenue-generating expansions.
Return as JSON array of scenarios.
      `;

      const response = await this.callOpenAI(
        prompt,
        "You are a product strategy expert.",
      );

      return this.parseRoadmap(response);
    } catch (error) {
      console.error("Roadmap generation error:", error);
      return this.getDefaultRoadmap();
    }
  }

  /**
   * Calculate expansion effort and ROI
   */
  async estimateExpansionROI(
    expansionType: string,
    currentRevenue: number,
  ): Promise<{ effort: number; expectedROI: number; payoffMonths: number }> {
    const baseData: {
      [key: string]: {
        effort: number;
        roeMultiplier: number;
      };
    } = {
      mobile: { effort: 200, roeMultiplier: 3 },
      blockchain: { effort: 150, roeMultiplier: 5 },
      iot: { effort: 180, roeMultiplier: 4 },
      ai: { effort: 120, roeMultiplier: 6 },
      api_marketplace: { effort: 80, roeMultiplier: 2.5 },
      enterprise_features: { effort: 100, roeMultiplier: 3.5 },
    };

    const data = baseData[expansionType] || {
      effort: 100,
      roeMultiplier: 2,
    };

    const monthlyRevenue = currentRevenue / 12;
    const expectedROI = monthlyRevenue * data.roeMultiplier;
    const payoffMonths = Math.ceil(data.effort / (expectedROI / 30));

    return {
      effort: data.effort,
      expectedROI,
      payoffMonths: Math.max(1, payoffMonths),
    };
  }

  private async callOpenAI(prompt: string, system: string): Promise<string> {
    // SECURITY: All calls proxied through secure /api/openai endpoint
    // The API key is stored server-side and never exposed to client
    const { chatCompletion } = await import("./secureOpenAIService");
    const response = await chatCompletion({
      messages: [
        {
          role: "system",
          content: system,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 1500,
    });

    return response;
  }

  private parseMobileExpansion(response: string): MobileExpansion {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.getDefaultMobileExpansion()!;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        platforms: parsed.platforms || ["ios", "android"],
        framework: parsed.framework || "react-native",
        features: parsed.features || [],
        offlineCapability: parsed.offlineCapability ?? true,
      };
    } catch {
      return this.getDefaultMobileExpansion()!;
    }
  }

  private parseBlockchainExpansion(response: string): BlockchainExpansion {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.getDefaultBlockchainExpansion()!;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        networks: parsed.networks || ["ethereum", "polygon"],
        smartContracts: parsed.smartContracts ?? false,
        nftSupport: parsed.nftSupport ?? false,
        paymentIntegration: parsed.paymentIntegration ?? true,
      };
    } catch {
      return this.getDefaultBlockchainExpansion()!;
    }
  }

  private parseIoTExpansion(response: string): IoTExpansion {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.getDefaultIoTExpansion()!;

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        protocols: parsed.protocols || ["mqtt"],
        devices: parsed.devices || ["sensors"],
        realTimeProcessing: parsed.realTimeProcessing ?? true,
        dataAggregation: parsed.dataAggregation ?? true,
      };
    } catch {
      return this.getDefaultIoTExpansion()!;
    }
  }

  private parseRoadmap(response: string): ExpansionScenario[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this.getDefaultRoadmap();

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any, index: number) => ({
        id: `scenario-${index}`,
        name: item.name || "Expansion",
        description: item.description || "",
        technologies: item.technologies || [],
        useCases: item.useCases || [],
        complexity: item.complexity || "moderate",
        estimatedTimeline: item.estimatedTimeline || "3-6 months",
      }));
    } catch {
      return this.getDefaultRoadmap();
    }
  }

  private getDefaultMobileExpansion(): MobileExpansion {
    return {
      platforms: ["ios", "android"],
      framework: "react-native",
      features: [
        "Offline support",
        "Push notifications",
        "Biometric auth",
        "Background sync",
      ],
      offlineCapability: true,
    };
  }

  private getDefaultBlockchainExpansion(): BlockchainExpansion {
    return {
      networks: ["ethereum", "polygon"],
      smartContracts: false,
      nftSupport: false,
      paymentIntegration: true,
    };
  }

  private getDefaultIoTExpansion(): IoTExpansion {
    return {
      protocols: ["mqtt"],
      devices: ["sensors", "gateways"],
      realTimeProcessing: true,
      dataAggregation: true,
    };
  }

  private getDefaultRoadmap(): ExpansionScenario[] {
    return [
      {
        id: "scenario-1",
        name: "Mobile App Launch",
        description: "Native iOS and Android apps",
        technologies: ["React Native", "Firebase"],
        useCases: ["On-the-go access", "Offline usage"],
        complexity: "moderate",
        estimatedTimeline: "4-6 months",
      },
      {
        id: "scenario-2",
        name: "API Marketplace",
        description: "Expose core functionality via API",
        technologies: ["REST API", "API Keys", "Rate Limiting"],
        useCases: ["Partner integrations", "Developer ecosystem"],
        complexity: "simple",
        estimatedTimeline: "2-3 months",
      },
      {
        id: "scenario-3",
        name: "Enterprise Features",
        description: "Advanced features for enterprise clients",
        technologies: ["SSO", "SAML", "Audit logging"],
        useCases: ["Fortune 500 sales", "Compliance"],
        complexity: "moderate",
        estimatedTimeline: "3-4 months",
      },
    ];
  }
}

export const futureExpansionEngine = new FutureExpansionEngine();

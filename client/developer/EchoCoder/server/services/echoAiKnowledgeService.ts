import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

let supabase: any = null;
let openai: any = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      throw new Error("Supabase credentials not configured");
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.ECHO_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "CRITICAL: ECHO_OPENAI_API_KEY environment variable not set. " +
          "Cannot initialize OpenAI client. Set the environment variable and restart the server.",
      );
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface LUCCCAModule {
  moduleName: string;
  modulePath: string;
  moduleType: "service" | "component" | "page" | "utility" | "hook";
  description: string;
  primaryFunction: string;
  dependencies: string[];
  exports: string[];
  linesOfCode: number;
}

interface EmbeddingData {
  contentType: string;
  sourceName: string;
  sectionTitle: string;
  contentText: string;
  metadata: Record<string, any>;
}

/**
 * EchoAI Knowledge Service
 * Master indexer for LUCCCA Enterprise system knowledge base
 * Handles: Module indexing, file scanning, embedding generation, RAG retrieval
 */
export class EchoAiKnowledgeService {
  private knowledgeCache: Map<string, any> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();

  /**
   * Scan and index all LUCCCA modules
   * Run on startup to build initial knowledge base
   */
  async indexLUCCCAModules(): Promise<{
    modulesIndexed: number;
    filesIndexed: number;
    embeddingsCreated: number;
  }> {
    console.log("🔍 Starting LUCCCA module indexing...");

    const modules = this.discoverModules();
    let filesIndexed = 0;
    let embeddingsCreated = 0;

    for (const module of modules) {
      try {
        // Store module metadata
        const { error: moduleError } = await supabase
          .from("echo_luccca_modules")
          .upsert({
            module_name: module.moduleName,
            module_path: module.modulePath,
            module_type: module.moduleType,
            description: module.description,
            primary_function: module.primaryFunction,
            dependencies: module.dependencies,
            exports: module.exports,
            lines_of_code: module.linesOfCode,
            last_scanned: new Date(),
          });

        if (moduleError) {
          console.error(
            `Error indexing module ${module.moduleName}:`,
            moduleError,
          );
          continue;
        }

        // Read and index file content
        try {
          const fileContent = fs.readFileSync(module.modulePath, "utf-8");
          filesIndexed++;

          // Create embeddings for key sections
          const sections = this.parseModuleIntoSections(
            module.moduleName,
            fileContent,
          );
          for (const section of sections) {
            const embeddingId = await this.createEmbedding({
              contentType: module.moduleType,
              sourceName: module.moduleName,
              sectionTitle: section.title,
              contentText: section.text,
              metadata: {
                filePath: module.modulePath,
                type: module.moduleType,
              },
            });
            if (embeddingId) embeddingsCreated++;
          }
        } catch (readError) {
          console.error(`Could not read file ${module.modulePath}:`, readError);
        }
      } catch (error) {
        console.error(`Error processing module ${module.moduleName}:`, error);
      }
    }

    console.log(
      `✅ Indexing complete: ${modules.length} modules, ${filesIndexed} files, ${embeddingsCreated} embeddings`,
    );

    return {
      modulesIndexed: modules.length,
      filesIndexed,
      embeddingsCreated,
    };
  }

  /**
   * Discover all LUCCCA modules
   * Scans client/services, client/components, client/pages, client/hooks
   */
  private discoverModules(): LUCCCAModule[] {
    const modules: LUCCCAModule[] = [];

    // Define module directories
    const moduleDirectories = [
      { dir: "client/services", type: "service" as const },
      { dir: "client/components", type: "component" as const },
      { dir: "client/pages", type: "page" as const },
      { dir: "client/hooks", type: "hook" as const },
    ];

    for (const { dir, type } of moduleDirectories) {
      if (!fs.existsSync(dir)) continue;

      const files = fs
        .readdirSync(dir, { recursive: true })
        .filter(
          (f) =>
            typeof f === "string" && (f.endsWith(".ts") || f.endsWith(".tsx")),
        ) as string[];

      for (const file of files) {
        const filePath = path.join(dir, file);
        const moduleName = path.basename(file, path.extname(file));

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const linesOfCode = content.split("\n").length;

          // Extract exports
          const exports = this.extractExports(content);

          // Extract dependencies
          const dependencies = this.extractDependencies(content);

          // Get primary function from comments
          const primaryFunction = this.extractPrimaryFunction(
            content,
            moduleName,
          );

          modules.push({
            moduleName,
            modulePath: filePath,
            moduleType: type,
            description: `${moduleName} ${type} module`,
            primaryFunction,
            dependencies,
            exports,
            linesOfCode,
          });
        } catch (error) {
          console.warn(`Could not process ${filePath}:`, error);
        }
      }
    }

    return modules;
  }

  /**
   * Parse a module into logical sections for embedding
   * Breaks code into functions, classes, comments
   */
  private parseModuleIntoSections(
    moduleName: string,
    fileContent: string,
  ): Array<{ title: string; text: string }> {
    const sections: Array<{ title: string; text: string }> = [];

    // Section 1: File overview
    const lines = fileContent.split("\n");
    const docComment = lines
      .slice(0, 20)
      .filter((l) => l.includes("//") || l.includes("/*"))
      .join("\n");

    if (docComment) {
      sections.push({
        title: "Overview",
        text: `${moduleName} - ${docComment}`,
      });
    }

    // Section 2: Exports
    const exportLines = lines.filter((l) => l.includes("export"));
    if (exportLines.length > 0) {
      sections.push({
        title: "Exports",
        text: exportLines.join("\n").substring(0, 1000),
      });
    }

    // Section 3: Key functions/classes (up to first 2000 chars of each)
    const functionRegex = /(?:export\s+)?(?:function|const|class)\s+(\w+)/g;
    let match;
    while ((match = functionRegex.exec(fileContent)) !== null) {
      sections.push({
        title: `Function: ${match[1]}`,
        text: fileContent.substring(match.index, match.index + 1000),
      });
    }

    return sections;
  }

  /**
   * Extract exported functions/components from code
   */
  private extractExports(content: string): string[] {
    const exportRegex =
      /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
    const exports: string[] = [];
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  /**
   * Extract import dependencies
   */
  private extractDependencies(content: string): string[] {
    const importRegex = /import\s+.*?from\s+["']([^"']+)["']/g;
    const dependencies: string[] = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (!match[1].startsWith(".")) {
        // Only external dependencies
        dependencies.push(match[1]);
      }
    }
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Extract primary function description from comments
   */
  private extractPrimaryFunction(content: string, moduleName: string): string {
    const firstComment = content.match(/\/\*[\s\S]*?\*\//)?.[0] || "";
    return (
      firstComment.substring(0, 200) ||
      `${moduleName} module with core functionality`
    );
  }

  /**
   * Create vector embedding for content
   * Uses OpenAI embeddings API
   */
  async createEmbedding(data: EmbeddingData): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = data.contentText.substring(0, 100);
      if (this.embeddingCache.has(cacheKey)) {
        const cachedEmbedding = this.embeddingCache.get(cacheKey);
        // Insert cached embedding
        const { data: result, error } = await supabase
          .from("echo_knowledge_embeddings")
          .insert({
            content_type: data.contentType,
            source_name: data.sourceName,
            section_title: data.sectionTitle,
            content_text: data.contentText.substring(0, 2000), // Limit text storage
            embedding: cachedEmbedding,
            metadata: data.metadata,
          })
          .select("id");

        if (error) {
          console.error("Error storing embedding:", error);
          return null;
        }
        return result?.[0]?.id || null;
      }

      // Generate new embedding
      const response = await getOpenAIClient().embeddings.create({
        model: "text-embedding-3-small",
        input: data.contentText.substring(0, 8000), // Limit input
        dimensions: 1536,
      });

      const embedding = response.data[0].embedding as number[];

      // Cache it
      this.embeddingCache.set(cacheKey, embedding);

      // Store in database
      const { data: result, error } = await supabase
        .from("echo_knowledge_embeddings")
        .insert({
          content_type: data.contentType,
          source_name: data.sourceName,
          section_title: data.sectionTitle,
          content_text: data.contentText.substring(0, 2000),
          embedding,
          metadata: data.metadata,
        })
        .select("id");

      if (error) {
        console.error("Error storing embedding:", error);
        return null;
      }

      return result?.[0]?.id || null;
    } catch (error) {
      console.error("Error creating embedding:", error);
      return null;
    }
  }

  /**
   * Search knowledge base using vector similarity
   * Returns most relevant knowledge chunks
   */
  async searchKnowledge(
    query: string,
    limit: number = 5,
  ): Promise<
    Array<{
      id: string;
      sourceName: string;
      sectionTitle: string;
      content: string;
      similarity: number;
    }>
  > {
    try {
      // Generate query embedding
      const response = await getOpenAIClient().embeddings.create({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 1536,
      });

      const queryEmbedding = response.data[0].embedding as number[];

      // Search in Supabase using vector similarity
      const { data, error } = await getSupabaseClient().rpc(
        "search_echo_knowledge",
        {
          query_embedding: queryEmbedding,
          match_limit: limit,
          match_threshold: 0.7,
        },
      );

      if (error) {
        console.error("Knowledge search error:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        sourceName: row.source_name,
        sectionTitle: row.section_title,
        content: row.content_text,
        similarity: row.similarity,
      }));
    } catch (error) {
      console.error("Error searching knowledge:", error);
      return [];
    }
  }

  /**
   * Get module information by name
   * Fast lookup from cache or DB
   */
  async getModuleInfo(moduleName: string): Promise<LUCCCAModule | null> {
    // Check cache first
    if (this.knowledgeCache.has(moduleName)) {
      return this.knowledgeCache.get(moduleName);
    }

    // Query database
    const { data, error } = await supabase
      .from("echo_luccca_modules")
      .select("*")
      .eq("module_name", moduleName)
      .single();

    if (error || !data) return null;

    const module: LUCCCAModule = {
      moduleName: data.module_name,
      modulePath: data.module_path,
      moduleType: data.module_type,
      description: data.description,
      primaryFunction: data.primary_function,
      dependencies: data.dependencies || [],
      exports: data.exports || [],
      linesOfCode: data.lines_of_code,
    };

    // Cache it
    this.knowledgeCache.set(moduleName, module);
    return module;
  }

  /**
   * Get all modules of a specific type
   */
  async getModulesByType(
    type: "service" | "component" | "page" | "utility" | "hook",
  ): Promise<LUCCCAModule[]> {
    const { data, error } = await supabase
      .from("echo_luccca_modules")
      .select("*")
      .eq("module_type", type);

    if (error) return [];

    return (data || []).map((row) => ({
      moduleName: row.module_name,
      modulePath: row.module_path,
      moduleType: row.module_type,
      description: row.description,
      primaryFunction: row.primary_function,
      dependencies: row.dependencies || [],
      exports: row.exports || [],
      linesOfCode: row.lines_of_code,
    }));
  }

  /**
   * Get system health metrics
   * Check if safe to deploy hot updates
   */
  async getSystemHealth(): Promise<{
    activeUsers: number;
    systemLoadPercent: number;
    memoryUsageMb: number;
    errorRatePercent: number;
    safeToDeploy: boolean;
    safeThresholdUsers: number;
    safeThresholdLoadPercent: number;
  }> {
    const { data, error } = await supabase
      .from("echo_system_health")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        activeUsers: 0,
        systemLoadPercent: 0,
        memoryUsageMb: 0,
        errorRatePercent: 0,
        safeToDeploy: true,
        safeThresholdUsers: 10,
        safeThresholdLoadPercent: 85,
      };
    }

    return {
      activeUsers: data.active_users || 0,
      systemLoadPercent: data.system_load_percent || 0,
      memoryUsageMb: data.memory_usage_mb || 0,
      errorRatePercent: data.error_rate_percent || 0,
      safeToDeploy: data.safe_to_deploy || true,
      safeThresholdUsers: data.safe_threshold_users || 10,
      safeThresholdLoadPercent: data.safe_threshold_load_percent || 85,
    };
  }

  /**
   * Update system health metrics
   */
  async updateSystemHealth(metrics: {
    activeUsers?: number;
    systemLoadPercent?: number;
    memoryUsageMb?: number;
    errorRatePercent?: number;
    activeConnections?: number;
  }): Promise<void> {
    const safeThresholdUsers = 10;
    const safeThresholdLoad = 85;

    const safeToDeploy =
      (metrics.activeUsers || 0) < safeThresholdUsers &&
      (metrics.systemLoadPercent || 0) < safeThresholdLoad;

    await getSupabaseClient()
      .from("echo_system_health")
      .insert({
        active_users: metrics.activeUsers || 0,
        system_load_percent: metrics.systemLoadPercent || 0,
        memory_usage_mb: metrics.memoryUsageMb || 0,
        error_rate_percent: metrics.errorRatePercent || 0,
        active_connections: metrics.activeConnections || 0,
        safe_to_deploy: safeToDeploy,
        safe_threshold_users: safeThresholdUsers,
        safe_threshold_load_percent: safeThresholdLoad,
      });
  }

  /**
   * Queue a deployment (hot-load with safety checks)
   */
  async queueDeployment(
    changes: Record<string, any>,
    userId: string,
  ): Promise<string> {
    const health = await this.getSystemHealth();

    if (!health.safeToDeploy) {
      throw new Error(
        `System not safe for deployment. Active users: ${health.activeUsers}/${health.safeThresholdUsers}, Load: ${health.systemLoadPercent}%/${health.safeThresholdLoadPercent}%`,
      );
    }

    const { data, error } = await supabase
      .from("echo_deployment_queue")
      .insert({
        changes_json: changes,
        requested_by: userId,
        status: "pending",
        priority: 0,
      })
      .select("id");

    if (error) throw error;

    return data?.[0]?.id || "";
  }

  /**
   * Log AI conversation
   */
  async logConversation(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    persona: string,
    confidenceScore: number,
    actionsTaken: string[] = [],
  ): Promise<void> {
    await getSupabaseClient()
      .from("echo_ai_conversations")
      .insert({
        user_id: userId,
        session_id: sessionId,
        current_persona: persona,
        user_message: userMessage,
        ai_response: aiResponse,
        confidence_score: confidenceScore,
        actions_taken: actionsTaken,
        outcome: confidenceScore > 0.8 ? "success" : "partial",
      });
  }
}

// Singleton export
export const echoAiKnowledgeService = new EchoAiKnowledgeService();

import type { RequestHandler } from "express";
import fs from "fs";
import path from "path";
import {
  ChangeType,
  ChangeRequest,
  applyChangeRequest,
  createChangeRequest,
  loadChangeRequests,
  runCheck,
  stageFiles,
  updateChangeRequest,
} from "../services/changeControl";

async function callOpenAI(prompt: string, apiKey: string) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert React component generator. Generate production-ready React components based on the user's description.
            Return ONLY valid JSON with this structure:
            {
              "componentCode": "import React from 'react'...",
              "success": true
            }
            
            The component should:
            - Use React hooks (useState, useEffect, etc.)
            - Follow TypeScript best practices
            - Include proper error handling
            - Use Tailwind CSS for styling
            - Be fully functional and complete`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || response.statusText}`,
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
      const result = JSON.parse(content);
      return result;
    } catch {
      return { componentCode: content, success: true };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

function sanitizeModuleName(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9]/g, "")
      .charAt(0)
      .toUpperCase() + name.replace(/[^a-zA-Z0-9]/g, "").slice(1)
  );
}

function generateModuleRoute(moduleName: string): string {
  return "/" + moduleName.toLowerCase();
}

type ChangeControlInput = {
  tenantId?: string;
  changeType?: ChangeType;
  title?: string;
  description?: string;
};

function getChangeControl(
  body: any,
  fallbackTitle: string,
  fallbackDescription: string,
): Required<ChangeControlInput> | null {
  const changeControl = (body?.changeControl || {}) as ChangeControlInput;
  const tenantId = String(changeControl.tenantId || "").trim();
  const changeType = changeControl.changeType;
  if (!tenantId || !changeType) return null;
  return {
    tenantId,
    changeType,
    title: changeControl.title?.trim() || fallbackTitle,
    description: changeControl.description?.trim() || fallbackDescription,
  };
}

async function persistStaging(
  changeRequest: ChangeRequest,
  files: { relativePath: string; content: string }[],
): Promise<ChangeRequest> {
  const stagedPaths = await stageFiles(process.cwd(), changeRequest.id, files);
  const updated = await updateChangeRequest(
    process.cwd(),
    changeRequest.id,
    (req) => ({
      ...req,
      stagedPaths,
    }),
  );
  return updated ?? changeRequest;
}

export const handleEchoCoderGenerate: RequestHandler = async (req, res) => {
  try {
    const { description, moduleName } = req.body;
    const apiKey = process.env.ECHO_OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    if (!description || !moduleName) {
      return res
        .status(400)
        .json({ error: "Missing description or moduleName" });
    }

    const sanitizedName = sanitizeModuleName(moduleName);
    const route = generateModuleRoute(sanitizedName);
    const changeControl = getChangeControl(
      req.body,
      `Generate module ${sanitizedName}`,
      description,
    );

    if (!changeControl) {
      return res.status(400).json({
        error: "Missing change control metadata (tenantId, changeType)",
      });
    }

    const prompt = `Create a React component for a ${sanitizedName} module with the following requirements:
    
    Description: ${description}
    
    Return a complete, functional React component that:
    1. Is named ${sanitizedName}Content
    2. Accepts no props initially
    3. Uses React hooks for state management
    4. Includes proper error handling
    5. Uses Tailwind CSS classes for styling
    6. Has realistic sample data
    7. Is production-ready
    
    Also generate a page component wrapper for this module.`;

    const result = await callOpenAI(prompt, apiKey);

    if (!result.success && !result.componentCode) {
      return res.status(500).json({ error: "Failed to generate component" });
    }

    const componentCode = result.componentCode || result;
    const pageCode = `import React from 'react';
import { ${sanitizedName}Content } from '@/components/modules/${sanitizedName}Content';

export default function ${sanitizedName}Page() {
  return <${sanitizedName}Content />;
}`;

    const changeRequest = await createChangeRequest(process.cwd(), {
      tenantId: changeControl.tenantId,
      changeType: changeControl.changeType,
      operation: "generate",
      title: changeControl.title,
      description: changeControl.description,
    });

    const staged = await persistStaging(changeRequest, [
      {
        relativePath: path.join(
          "client",
          "components",
          "modules",
          `${sanitizedName}Content.tsx`,
        ),
        content: componentCode,
      },
      {
        relativePath: path.join(
          "client",
          "pages",
          "modules",
          `${sanitizedName}.tsx`,
        ),
        content: pageCode,
      },
    ]);

    res.json({
      success: true,
      moduleName: sanitizedName,
      route,
      componentPath: `client/components/modules/${sanitizedName}Content.tsx`,
      pagePath: `client/pages/modules/${sanitizedName}.tsx`,
      message: `Module ${sanitizedName} staged for ${changeControl.tenantId}`,
      changeRequest: staged,
    });
  } catch (error) {
    console.error("Error in handleEchoCoderGenerate:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleEchoCoderFix: RequestHandler = async (req, res) => {
  try {
    const { moduleName, errorDescription } = req.body;
    const apiKey = process.env.ECHO_OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    if (!moduleName || !errorDescription) {
      return res
        .status(400)
        .json({ error: "Missing moduleName or errorDescription" });
    }

    const modulePath = path.join(
      process.cwd(),
      "client",
      "components",
      "modules",
      `${moduleName}Content.tsx`,
    );

    let existingCode = "";
    if (fs.existsSync(modulePath)) {
      existingCode = fs.readFileSync(modulePath, "utf-8");
    }

    const changeControl = getChangeControl(
      req.body,
      `Fix module ${moduleName}`,
      errorDescription,
    );

    if (!changeControl) {
      return res.status(400).json({
        error: "Missing change control metadata (tenantId, changeType)",
      });
    }

    const prompt = `Fix the following React component based on the error description:

    Current Code:
    \`\`\`
    ${existingCode}
    \`\`\`
    
    Error/Issue: ${errorDescription}
    
    Please:
    1. Fix the identified issues
    2. Maintain the component's functionality
    3. Keep the same export structure
    4. Return only the corrected component code`;

    const result = await callOpenAI(prompt, apiKey);
    const fixedCode = result.componentCode || result;

    const changeRequest = await createChangeRequest(process.cwd(), {
      tenantId: changeControl.tenantId,
      changeType: changeControl.changeType,
      operation: "fix",
      title: changeControl.title,
      description: changeControl.description,
    });

    const staged = await persistStaging(changeRequest, [
      {
        relativePath: path.join(
          "client",
          "components",
          "modules",
          `${moduleName}Content.tsx`,
        ),
        content: fixedCode,
      },
    ]);

    res.json({
      success: true,
      moduleName,
      message: `Module ${moduleName} fix staged for ${changeControl.tenantId}`,
      fixed: true,
      changeRequest: staged,
    });
  } catch (error) {
    console.error("Error in handleEchoCoderFix:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleEchoCoderAnalyze: RequestHandler = async (req, res) => {
  try {
    const { moduleName } = req.params;

    const modulePath = path.join(
      process.cwd(),
      "client",
      "components",
      "modules",
      `${moduleName}Content.tsx`,
    );

    if (!fs.existsSync(modulePath)) {
      return res.status(404).json({ error: `Module ${moduleName} not found` });
    }

    const code = fs.readFileSync(modulePath, "utf-8");
    const issues: string[] = [];

    if (!code.includes("export")) {
      issues.push("Component is not exported");
    }

    if (!code.includes("import React") && !code.includes("import { React")) {
      issues.push("Missing React import");
    }

    if (!code.includes("return")) {
      issues.push("Component does not return JSX");
    }

    res.json({
      healthy: issues.length === 0,
      issues,
      moduleName,
    });
  } catch (error) {
    console.error("Error in handleEchoCoderAnalyze:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleEchoCoderAccess: RequestHandler = async (req, res) => {
  try {
    const { passcode } = req.body || {};
    const required = process.env.ECHOCODER_ADMIN_CODE;

    if (required && String(passcode || "") !== required) {
      return res.status(401).json({ error: "Invalid super admin passcode" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error validating EchoCoder access:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Generate a module that uses Builder.io CMS content
 */
export const handleEchoCoderGenerateCMS: RequestHandler = async (req, res) => {
  try {
    const { description, moduleName, cmsModelId } = req.body;
    const apiKey = process.env.ECHO_OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    if (!description || !moduleName || !cmsModelId) {
      return res.status(400).json({
        error: "Missing description, moduleName, or cmsModelId",
      });
    }

    const sanitizedName = sanitizeModuleName(moduleName);
    const route = generateModuleRoute(sanitizedName);
    const changeControl = getChangeControl(
      req.body,
      `Generate CMS module ${sanitizedName}`,
      description,
    );

    if (!changeControl) {
      return res.status(400).json({
        error: "Missing change control metadata (tenantId, changeType)",
      });
    }

    const prompt = `Create a React component for a ${sanitizedName} module that fetches content from Builder.io CMS:

    Description: ${description}
    CMS Model ID: ${cmsModelId}

    Requirements:
    1. Component named ${sanitizedName}Content
    2. Uses a custom hook to fetch from Builder.io CMS
    3. Handles loading and error states
    4. Displays content from the CMS model
    5. Uses TypeScript interfaces for the CMS data
    6. Styled with Tailwind CSS
    7. Production-ready

    Include:
    - TypeScript type definitions for the CMS model
    - A fetch function that queries the Builder.io API
    - A custom React hook for managing the data
    - The main component using the hook`;

    const result = await callOpenAI(prompt, apiKey);

    if (!result.success && !result.componentCode) {
      return res
        .status(500)
        .json({ error: "Failed to generate CMS component" });
    }

    const componentCode = result.componentCode || result;

    const pageCode = `import React from 'react';
import { ${sanitizedName}Content } from '@/components/modules/${sanitizedName}Content';

export default function ${sanitizedName}Page() {
  return <${sanitizedName}Content />;
}`;

    const changeRequest = await createChangeRequest(process.cwd(), {
      tenantId: changeControl.tenantId,
      changeType: changeControl.changeType,
      operation: "generate",
      title: changeControl.title,
      description: changeControl.description,
    });

    const staged = await persistStaging(changeRequest, [
      {
        relativePath: path.join(
          "client",
          "components",
          "modules",
          `${sanitizedName}Content.tsx`,
        ),
        content: componentCode,
      },
      {
        relativePath: path.join(
          "client",
          "pages",
          "modules",
          `${sanitizedName}.tsx`,
        ),
        content: pageCode,
      },
    ]);

    res.json({
      success: true,
      moduleName: sanitizedName,
      route,
      componentPath: `client/components/modules/${sanitizedName}Content.tsx`,
      pagePath: `client/pages/modules/${sanitizedName}.tsx`,
      usesBuilderCMS: true,
      cmsModelId,
      message: `CMS-backed module ${sanitizedName} staged for ${changeControl.tenantId}`,
      changeRequest: staged,
    });
  } catch (error) {
    console.error("Error in handleEchoCoderGenerateCMS:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleEchoCoderUpgrade: RequestHandler = async (req, res) => {
  try {
    const { title, description, changeControl } = req.body || {};
    const tenantId = String(changeControl?.tenantId || "").trim();
    const changeType = changeControl?.changeType as ChangeType | undefined;

    if (!tenantId || !changeType || !title || !description) {
      return res.status(400).json({
        error: "Missing tenantId, changeType, title, or description",
      });
    }

    const changeRequest = await createChangeRequest(process.cwd(), {
      tenantId,
      changeType,
      operation: "upgrade",
      title: String(title).trim(),
      description: String(description).trim(),
    });

    res.json({ success: true, changeRequest });
  } catch (error) {
    console.error("Error in handleEchoCoderUpgrade:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleListChangeRequests: RequestHandler = async (_req, res) => {
  try {
    const requests = await loadChangeRequests(process.cwd());
    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error listing change requests:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleRunChangeChecks: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requests = await loadChangeRequests(process.cwd());
    const request = requests.find((r) => r.id === id);

    if (!request) {
      return res.status(404).json({ error: "Change request not found" });
    }

    const smokeCommand = process.env.ECHOCODER_SMOKE_TEST_COMMAND;
    const auditCommand = process.env.ECHOCODER_AUDIT_COMMAND;
    const securityCommand = process.env.ECHOCODER_SECURITY_COMMAND;

    const checkResults: Partial<Record<keyof ChangeRequest["checks"], any>> =
      {};

    for (const checkType of request.requiredChecks) {
      const command =
        checkType === "smoke"
          ? smokeCommand
          : checkType === "audit"
            ? auditCommand
            : securityCommand;
      checkResults[checkType] = await runCheck(checkType, command);
    }

    const updated = await updateChangeRequest(process.cwd(), request.id, (r) => {
      const checks = { ...r.checks, ...checkResults };
      const requiredPassed = r.requiredChecks.every(
        (check) => checks[check]?.status === "passed",
      );
      return {
        ...r,
        checks,
        status: requiredPassed ? "ready_for_approval" : "pending_tests",
      };
    });

    res.json({ success: true, changeRequest: updated });
  } catch (error) {
    console.error("Error running change checks:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleApproveChangeRequest: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateChangeRequest(process.cwd(), id, (r) => {
      if (r.status !== "ready_for_approval") {
        return {
          ...r,
          failureReason:
            "Change request is not ready for approval. Run required checks.",
        };
      }
      return {
        ...r,
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy:
          (req as any)?.user?.email || (req as any)?.user?.id || "system",
        failureReason: undefined,
      };
    });

    if (!updated) {
      return res.status(404).json({ error: "Change request not found" });
    }

    res.json({ success: true, changeRequest: updated });
  } catch (error) {
    console.error("Error approving change request:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const handleApplyChangeRequest: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const requests = await loadChangeRequests(process.cwd());
    const request = requests.find((r) => r.id === id);

    if (!request) {
      return res.status(404).json({ error: "Change request not found" });
    }

    if (request.status !== "approved") {
      return res.status(400).json({
        error: "Change request must be approved before apply",
      });
    }

    const appliedPaths = await applyChangeRequest(process.cwd(), request);
    const updated = await updateChangeRequest(process.cwd(), request.id, (r) => ({
      ...r,
      status: "applied",
      appliedAt: new Date().toISOString(),
      appliedPaths,
      failureReason: undefined,
    }));

    res.json({ success: true, changeRequest: updated });
  } catch (error) {
    console.error("Error applying change request:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

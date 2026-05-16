import { Router, Request, Response } from "express";
import { OpenAI } from "openai";
import { getCacheService } from "../services/cacheService";

const router = Router();
const cache = getCacheService();
const openai = new OpenAI({
  apiKey: process.env.ECHO_OPENAI_API_KEY,
});

interface CodeGenerationRequest {
  language: "python" | "go" | "rust" | "csharp" | "java" | "php";
  description: string;
  framework?: string;
  features?: string[];
  includeTests?: boolean;
  includeDocumentation?: boolean;
}

interface GeneratedCode {
  language: string;
  code: string;
  filename: string;
  description: string;
  features: string[];
  testFile?: string;
  documentation?: string;
}

const languageTemplates: Record<string, string> = {
  python: `# Python Module
# Description: {description}
# Framework: {framework}

from typing import Dict, List, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod

@dataclass
class Config:
    """Configuration class for the module"""
    pass

class BaseModule(ABC):
    """Base class for all modules"""
    
    def __init__(self):
        self.config = Config()
    
    @abstractmethod
    def execute(self):
        """Execute the main logic"""
        pass

class {ClassName}(BaseModule):
    """Main implementation class"""
    
    def __init__(self):
        super().__init__()
    
    def execute(self):
        """Execute main functionality"""
        pass

if __name__ == "__main__":
    module = {ClassName}()
    module.execute()
`,

  go: `package main

import (
    "fmt"
    "log"
)

// Config holds configuration
type Config struct {
    // Add fields here
}

// Module represents the main module
type Module struct {
    config Config
}

// NewModule creates a new module instance
func NewModule(config Config) *Module {
    return &Module{
        config: config,
    }
}

// Execute runs the main logic
func (m *Module) Execute() error {
    // Implementation here
    return nil
}

func main() {
    config := Config{}
    module := NewModule(config)
    
    if err := module.Execute(); err != nil {
        log.Fatalf("Error: %v", err)
    }
    
    fmt.Println("Module executed successfully")
}
`,

  rust: `// Rust Module
// Description: {description}
// Framework: {framework}

use std::error::Error;

#[derive(Debug, Clone)]
pub struct Config {
    // Add fields here
}

pub struct Module {
    config: Config,
}

impl Module {
    pub fn new(config: Config) -> Self {
        Module { config }
    }

    pub fn execute(&self) -> Result<(), Box<dyn Error>> {
        // Implementation here
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_creation() {
        let config = Config {};
        let module = Module::new(config);
        assert!(true);
    }
}

fn main() -> Result<(), Box<dyn Error>> {
    let config = Config {};
    let module = Module::new(config);
    module.execute()?;
    println!("Module executed successfully");
    Ok(())
}
`,

  csharp: `using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace {ProjectName}
{
    public class Config
    {
        // Add properties here
    }

    public abstract class BaseModule
    {
        protected Config Config { get; set; }

        public BaseModule()
        {
            Config = new Config();
        }

        public abstract Task ExecuteAsync();
    }

    public class {ClassName} : BaseModule
    {
        public {ClassName}() : base()
        {
        }

        public override async Task ExecuteAsync()
        {
            // Implementation here
            await Task.CompletedTask;
        }
    }

    class Program
    {
        static async Task Main(string[] args)
        {
            var module = new {ClassName}();
            await module.ExecuteAsync();
            Console.WriteLine("Module executed successfully");
        }
    }
}
`,

  java: `package com.example;

import java.util.*;
import java.util.concurrent.CompletableFuture;

public class Config {
    // Add fields here
}

public abstract class BaseModule {
    protected Config config;

    public BaseModule() {
        this.config = new Config();
    }

    public abstract void execute() throws Exception;
}

public class {ClassName} extends BaseModule {
    public {ClassName}() {
        super();
    }

    @Override
    public void execute() throws Exception {
        // Implementation here
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        {ClassName} module = new {ClassName}();
        module.execute();
        System.out.println("Module executed successfully");
    }
}
`,

  php: `<?php

namespace MyApp;

use Exception;

class Config {
    // Add properties here
}

abstract class BaseModule {
    protected Config $config;

    public function __construct() {
        $this->config = new Config();
    }

    abstract public function execute();
}

class {ClassName} extends BaseModule {
    public function __construct() {
        parent::__construct();
    }

    public function execute() {
        // Implementation here
    }
}

// Main execution
try {
    $module = new {ClassName}();
    $module->execute();
    echo "Module executed successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
`,
};

const testTemplates: Record<string, string> = {
  python: `import pytest
from {module_name} import {ClassName}

class Test{ClassName}:
    @pytest.fixture
    def module(self):
        return {ClassName}()

    def test_module_creation(self, module):
        assert module is not None

    def test_execute(self, module):
        result = module.execute()
        assert result is not None
`,

  go: `package main

import (
    "testing"
)

func TestModuleCreation(t *testing.T) {
    config := Config{}
    module := NewModule(config)
    if module == nil {
        t.Error("Expected module to be created")
    }
}

func TestExecute(t *testing.T) {
    config := Config{}
    module := NewModule(config)
    err := module.Execute()
    if err != nil {
        t.Errorf("Expected no error, got %v", err)
    }
}
`,

  rust: `#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_module_creation() {
        let config = Config {};
        let module = Module::new(config);
        // Add assertions
    }

    #[test]
    fn test_execute() {
        let config = Config {};
        let module = Module::new(config);
        let result = module.execute();
        assert!(result.is_ok());
    }
}
`,

  csharp: `using Xunit;
using {ProjectName};

public class {ClassName}Tests
{
    [Fact]
    public void Constructor_CreatesInstance()
    {
        var module = new {ClassName}();
        Assert.NotNull(module);
    }

    [Fact]
    public async void ExecuteAsync_Completes()
    {
        var module = new {ClassName}();
        await module.ExecuteAsync();
        Assert.True(true);
    }
}
`,

  java: `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

public class {ClassName}Test {
    private {ClassName} module;

    @BeforeEach
    void setUp() {
        module = new {ClassName}();
    }

    @Test
    void testCreation() {
        assertNotNull(module);
    }

    @Test
    void testExecute() throws Exception {
        module.execute();
        assertTrue(true);
    }
}
`,

  php: `<?php

use PHPUnit\\Framework\\TestCase;

class {ClassName}Test extends TestCase {
    private $module;

    protected function setUp(): void {
        $this->module = new {ClassName}();
    }

    public function testCreation() {
        $this->assertNotNull($this->module);
    }

    public function testExecute() {
        $this->module->execute();
        $this->assertTrue(true);
    }
}
?>
`,
};

async function generateCodeForLanguage(
  req: CodeGenerationRequest,
  language: string,
): Promise<GeneratedCode> {
  const systemPrompt = `You are an expert ${language} developer. Generate production-ready ${language} code based on the description provided. Follow best practices, include error handling, and use the appropriate framework if specified.`;

  const userPrompt = `Generate a complete ${language} module with the following specifications:
Description: ${req.description}
Framework: ${req.framework || "Standard/Core"}
Features: ${req.features?.join(", ") || "Basic functionality"}

Return ONLY the code, no explanations.`;

  const cacheKey = `code:${language}:${req.description}:${req.framework}`;
  const cached = await cache.get<GeneratedCode>(cacheKey);
  if (cached) {
    return cached;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  let code =
    completion.choices[0]?.message?.content ||
    languageTemplates[language] ||
    "";

  const className = req.description
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
    .substring(0, 30);

  code = code
    .replace(/{ClassName}/g, className)
    .replace(/{ProjectName}/g, className)
    .replace(/{description}/g, req.description)
    .replace(/{framework}/g, req.framework || "Core")
    .replace(/{module_name}/g, className.toLowerCase());

  let testFile: string | undefined;
  if (req.includeTests) {
    testFile = testTemplates[language]
      ?.replace(/{ClassName}/g, className)
      .replace(/{ProjectName}/g, className)
      .replace(/{module_name}/g, className.toLowerCase());
  }

  let documentation: string | undefined;
  if (req.includeDocumentation) {
    documentation = `# ${className} Module

## Description
${req.description}

## Framework
${req.framework || "Standard"}

## Features
${req.features?.map((f) => `- ${f}`).join("\n") || "- Core functionality"}

## Usage
\`\`\`${language}
// Usage example
\`\`\`

## Testing
Run tests with the appropriate test runner for ${language}.

## Installation
Install required dependencies using your package manager.
`;
  }

  const result: GeneratedCode = {
    language,
    code,
    filename: `module.${getFileExtension(language)}`,
    description: req.description,
    features: req.features || [],
    testFile,
    documentation,
  };

  await cache.set(cacheKey, result, 86400);
  return result;
}

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    python: "py",
    go: "go",
    rust: "rs",
    csharp: "cs",
    java: "java",
    php: "php",
  };
  return extensions[language] || "txt";
}

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const {
      language,
      description,
      framework,
      features,
      includeTests,
      includeDocumentation,
    } = req.body as CodeGenerationRequest;

    if (!language || !description) {
      return res
        .status(400)
        .json({ error: "language and description are required" });
    }

    if (!["python", "go", "rust", "csharp", "java", "php"].includes(language)) {
      return res.status(400).json({ error: "Unsupported language" });
    }

    const code = await generateCodeForLanguage(
      {
        language: language as any,
        description,
        framework,
        features,
        includeTests,
        includeDocumentation,
      },
      language,
    );

    res.json({
      success: true,
      code,
    });
  } catch (error) {
    console.error("Code generation error:", error);
    res.status(500).json({ error: "Failed to generate code" });
  }
});

router.post("/generate-all", async (req: Request, res: Response) => {
  try {
    const {
      description,
      framework,
      features,
      includeTests,
      includeDocumentation,
    } = req.body;

    const languages: ("python" | "go" | "rust" | "csharp" | "java" | "php")[] =
      ["python", "go", "rust", "csharp"];

    const results = await Promise.all(
      languages.map((lang) =>
        generateCodeForLanguage(
          {
            language: lang,
            description,
            framework,
            features,
            includeTests,
            includeDocumentation,
          },
          lang,
        ),
      ),
    );

    res.json({
      success: true,
      codes: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Multi-language generation error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate code for all languages" });
  }
});

router.get("/supported-languages", (_req: Request, res: Response) => {
  res.json({
    success: true,
    languages: [
      {
        name: "Python",
        id: "python",
        description: "For data science, web, and backend development",
      },
      {
        name: "Go",
        id: "go",
        description: "For concurrent, high-performance services",
      },
      {
        name: "Rust",
        id: "rust",
        description: "For systems programming and performance-critical apps",
      },
      {
        name: "C#",
        id: "csharp",
        description: "For .NET applications and Windows development",
      },
      {
        name: "Java",
        id: "java",
        description: "For enterprise and cross-platform applications",
      },
      {
        name: "PHP",
        id: "php",
        description: "For web server-side programming",
      },
    ],
  });
});

export default router;

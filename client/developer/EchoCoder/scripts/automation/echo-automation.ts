#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  parseTasksFromText,
  processAutomationTasks,
  type AutomationTaskInput,
} from "../../automation/runner";

interface CliOptions {
  inputFile?: string;
  runTests?: boolean;
  label?: string;
}

function parseArgs(argv: string[]): { options: CliOptions; text?: string } {
  const options: CliOptions = {};
  const buffers: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--file":
      case "-f":
        options.inputFile = argv[++i];
        break;
      case "--run-tests":
        options.runTests = true;
        break;
      case "--label":
      case "-l":
        options.label = argv[++i];
        break;
      case "--" :
        buffers.push(...argv.slice(i + 1));
        i = argv.length;
        break;
      default:
        buffers.push(arg);
        break;
    }
  }

  const text = buffers.length ? buffers.join(" ") : undefined;
  return { options, text };
}

async function readInputText(options: CliOptions, inline?: string): Promise<string> {
  if (inline && inline.trim()) {
    return inline;
  }
  if (options.inputFile) {
    const resolved = path.resolve(process.cwd(), options.inputFile);
    return fs.readFile(resolved, "utf8");
  }
  // fallback to stdin
  const chunks: Buffer[] = [];
  if (process.stdin.isTTY) {
    throw new Error("No tasks provided. Pass a file via --file or pipe content to stdin.");
  }
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    const argv = process.argv.slice(2);
    const { options, text: inline } = parseArgs(argv);
    const raw = await readInputText(options, inline);
    const tasks = await parseTasksFromText(raw);
    if (!tasks.length) {
      throw new Error("Unable to parse any tasks from input");
    }
    const result = await processAutomationTasks(tasks, {
      runTests: options.runTests,
      label: options.label,
    });

    const summaryLines = [
      "Automation run completed:",
      ...result.summary.map((line) => `  ${line}`),
    ];
    if (result.tests?.length) {
      summaryLines.push("", "Tests:");
      for (const test of result.tests) {
        summaryLines.push(
          `  ${test.status === "success" ? "✅" : "❌"} ${test.command}`,
        );
        if (test.output) {
          summaryLines.push(
            ...test.output
              .split(/\r?\n/)
              .map((line) => `      ${line}`)
              .slice(0, 40),
          );
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(summaryLines.join("\n"));
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("Automation run failed:", error?.message || error);
    process.exitCode = 1;
  }
}

const thisFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFilePath) {
  void main();
}

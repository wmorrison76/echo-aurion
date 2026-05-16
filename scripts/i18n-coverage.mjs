import fs from "fs";
import path from "path";
import vm from "vm";

const repoRoot = process.cwd();
const i18nPath = path.join(repoRoot, "client", "i18n.tsx");
const modulesRoot = path.join(repoRoot, "client", "modules");
const reportPath = path.join(repoRoot, "docs", "I18N_COVERAGE_REPORT.md");

const readFile = (filePath) => fs.readFileSync(filePath, "utf8");

const extractDictionaries = (content) => {
  const marker = "const dictionaries";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("Unable to find dictionaries object in client/i18n.tsx");
  }

  const startIndex = content.indexOf("{", markerIndex);
  if (startIndex === -1) {
    throw new Error("Unable to locate dictionaries object start");
  }

  let depth = 0;
  let endIndex = -1;
  for (let i = startIndex; i < content.length; i += 1) {
    const char = content[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Unable to locate dictionaries object end");
  }

  const objectLiteral = content.slice(startIndex, endIndex + 1);
  const sandbox = {};
  const script = new vm.Script(`const dictionaries = ${objectLiteral}; dictionaries;`);
  return script.runInNewContext(sandbox);
};

const walkFiles = (dir, extensions, acc = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extensions, acc);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      acc.push(fullPath);
    }
  }
  return acc;
};

const extractTranslationKeys = (content) => {
  const keys = new Set();
  const regex = /\bt\(\s*["'`]([^"'`]+)["'`]\s*\)/g;
  let match = regex.exec(content);
  while (match) {
    keys.add(match[1]);
    match = regex.exec(content);
  }
  return keys;
};

const extractModuleName = (filePath) => {
  const parts = filePath.split(path.sep);
  const modulesIndex = parts.indexOf("modules");
  if (modulesIndex === -1 || modulesIndex + 1 >= parts.length) {
    return "unknown";
  }
  return parts[modulesIndex + 1];
};

const dictionaries = extractDictionaries(readFile(i18nPath));
const languages = Object.keys(dictionaries);
const englishKeys = new Set(Object.keys(dictionaries.en || {}));

const moduleFiles = walkFiles(modulesRoot, [".ts", ".tsx"]);
const moduleKeyMap = new Map();

for (const filePath of moduleFiles) {
  const content = readFile(filePath);
  const keys = extractTranslationKeys(content);
  if (!keys.size) continue;
  const moduleName = extractModuleName(filePath);
  if (!moduleKeyMap.has(moduleName)) {
    moduleKeyMap.set(moduleName, new Set());
  }
  const moduleKeys = moduleKeyMap.get(moduleName);
  for (const key of keys) {
    moduleKeys.add(key);
  }
}

const missingByLanguage = languages.map((lang) => {
  const langKeys = new Set(Object.keys(dictionaries[lang] || {}));
  const missing = [...englishKeys].filter((key) => !langKeys.has(key));
  return { lang, missing };
});

const moduleCoverage = [...moduleKeyMap.entries()].map(([moduleName, keys]) => {
  const coverageByLang = languages.map((lang) => {
    const langKeys = new Set(Object.keys(dictionaries[lang] || {}));
    const missing = [...keys].filter((key) => !langKeys.has(key));
    return { lang, missing };
  });
  return { moduleName, keys: [...keys], coverageByLang };
});

const lines = [];
lines.push("# i18n Coverage Report");
lines.push("");
lines.push(`**Generated:** ${new Date().toISOString()}`);
lines.push("");
lines.push("## Overall Dictionary Coverage");
lines.push("");
lines.push("| Language | Missing Keys vs en |");
lines.push("| --- | --- |");
for (const entry of missingByLanguage) {
  lines.push(`| ${entry.lang} | ${entry.missing.length} |`);
}
lines.push("");
lines.push("## Module-Level Coverage (keys used in module files)");
lines.push("");
for (const moduleEntry of moduleCoverage.sort((a, b) => a.moduleName.localeCompare(b.moduleName))) {
  lines.push(`### ${moduleEntry.moduleName}`);
  lines.push("");
  lines.push("| Language | Missing Keys |");
  lines.push("| --- | --- |");
  for (const langEntry of moduleEntry.coverageByLang) {
    lines.push(`| ${langEntry.lang} | ${langEntry.missing.length} |`);
  }
  lines.push("");
}

fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
console.log(`i18n coverage report written to ${reportPath}`);

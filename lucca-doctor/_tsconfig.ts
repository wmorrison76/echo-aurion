import path from 'path';
import ts from 'typescript';

const ROOT = process.cwd();

export interface AliasMap {
  [alias: string]: string;
}

function normalizeTarget(target: string): string {
  return target
    .replace(/^\.\//, '')
    .replace(/\/\*$/, '')
    .replace(/\/$/, '');
}

export function readTsconfigAliases(): AliasMap {
  const tsconfigPath = path.join(ROOT, 'tsconfig.json');
  const result = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (result.error) {
    throw new Error(`Failed to read tsconfig.json: ${result.error.messageText}`);
  }
  const paths = result.config?.compilerOptions?.paths || {};
  const map: AliasMap = {};
  for (const [alias, targets] of Object.entries(paths)) {
    if (Array.isArray(targets) && targets.length) {
      const cleanAlias = alias.replace(/\/\*$/, '');
      map[cleanAlias] = normalizeTarget(targets[0] as string);
    }
  }
  return map;
}

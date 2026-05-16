import * as fs from 'fs';
import * as path from 'path';

export const SystemMapGenerator = {
  generate(rootPath: string) {
    const map: any = {};
    function walk(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          map[fullPath] = {
            imports: (content.match(/import .* from/g) || []).length,
            exports: (content.match(/export /g) || []).length,
            hasTODOs: content.includes('TODO')
          };
        }
      }
    }
    walk(rootPath);
    return map;
  }
};

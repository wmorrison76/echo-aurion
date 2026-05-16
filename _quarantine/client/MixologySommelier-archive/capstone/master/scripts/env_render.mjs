// Renders ./public/config.json (or ./dist/config.json) from process env or .env
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = existsSync('dist') ? 'dist' : 'public';
mkdirSync(outDir, { recursive: true });

const config = {
  build_entry: process.env.BUILD_ENTRY || 'src/index.jsx',
  telemetry_endpoint: process.env.PHOENIX_TELEMETRY_ENDPOINT || null,
  release: {
    channel: process.env.RELEASE_CHANNEL || 'stable',
    tag: process.env.RELEASE_TAG || '0.1.0'
  }
};

writeFileSync(path.join(outDir, 'config.json'), JSON.stringify(config, null, 2));
console.log('✓ Wrote', path.join(outDir, 'config.json'));

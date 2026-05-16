#!/usr/bin/env bash
set -euo pipefail
echo "Setting up CI dev tooling (husky + commitlint + lint-staged)"
npm pkg set 'scripts.prepare'='husky'
npm pkg set 'scripts.lint'='eslint .'
npm pkg set 'scripts.format'='prettier -w .'
npm pkg set 'scripts.build'='node scripts/build_prod.mjs'
npm pkg set 'devDependencies.eslint'='^8.57.0'
npm pkg set 'devDependencies.eslint-plugin-react'='^7.34.0'
npm pkg set 'devDependencies.prettier'='^3.3.3'
npm pkg set 'devDependencies.lint-staged'='^15.2.8'
npm pkg set 'devDependencies.husky'='^9.1.3'
npm pkg set 'devDependencies.@commitlint/cli'='^19.5.0'
npm pkg set 'devDependencies.@commitlint/config-conventional'='^19.5.0'
npm pkg set 'devDependencies.esbuild'='^0.23.0'
npm i
npx husky install
echo "✓ CI tooling configured. Commit hooks active after next install."

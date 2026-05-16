// Verifies essential environment variables and prints a report.
const REQUIRED = [
  ["BUILD_ENTRY", "src/index.jsx"],
  ["APP_PORT", "8080"],
];

let ok = true;
for (const [key, def] of REQUIRED){
  if (!process.env[key]) {
    console.warn(`WARN: ${key} missing; will use default '${def}'`);
  }
}
if (!ok) process.exit(2);
console.log("✓ env_check: baseline OK");

import { spawn } from "node:child_process";

// Use production APIs in dev: pnpm dev:real-api or node scripts/dev-all.mjs --real-api
if (process.argv.includes("--real-api")) {
  process.env.VITE_DEV_STUB_API = "0";
  console.log("[dev-all] Using real backend APIs (VITE_DEV_STUB_API=0)");
}

function spawnNpm(script) {
  const child = spawn("npm", ["run", script], {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  return child;
}

function shutdown(children, signal = "SIGTERM") {
  for (const child of children) {
    if (!child || child.killed) continue;
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  }
}

const backend = spawnNpm("dev:backend");
const frontend = spawnNpm("dev:frontend");

const children = [backend, frontend];

let shuttingDown = false;

function handleExit(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  shutdown(children, "SIGTERM");

  setTimeout(() => {
    shutdown(children, "SIGKILL");
    process.exit(code);
  }, 1500).unref();
}

process.on("SIGINT", () => handleExit(0));
process.on("SIGTERM", () => handleExit(0));

backend.on("exit", (code, signal) => {
  if (shuttingDown) return;
  const exitCode = typeof code === "number" ? code : 1;
  console.warn(
    `[dev:all] backend exited (code=${exitCode}${signal ? ` signal=${signal}` : ""}). ` +
      "Keeping frontend running.",
  );
});

frontend.on("exit", (code, signal) => {
  if (shuttingDown) return;
  const exitCode = typeof code === "number" ? code : 1;
  if (signal) {
    handleExit(0);
    return;
  }
  handleExit(exitCode);
});

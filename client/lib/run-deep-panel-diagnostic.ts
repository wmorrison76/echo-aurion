/**
 * Deep panel diagnostic — walks React fiber tree to find error boundaries,
 * stuck Suspense, zero-height components, and the list of rendered components.
 * Call from dev tools or via keyboard shortcut (Cmd+Shift+D / Ctrl+Shift+D).
 */
export function runDeepPanelDiagnostic(): {
  errors: Array<{ boundary: string; error: string; stack?: string }>;
  suspenseStuck: Array<{ parent: string; depth: number }>;
  zeroHeight: Array<{ name: string; depth: number }>;
  renderedComponents: string[];
} | undefined {
  const rootEl = document.getElementById("root") ?? document.getElementById("app");
  if (!rootEl) {
    console.error("No root element found");
    return undefined;
  }

  const fiberKey = Object.keys(rootEl).find((k) => k.startsWith("__reactFiber"));
  if (!fiberKey) {
    console.warn("React fiber not available (dev tool)", { hint: "This is normal if React DevTools is not installed or in certain environments" });
    return undefined;
  }

  const errors: Array<{ boundary: string; error: string; stack?: string }> = [];
  const suspenseStuck: Array<{ parent: string; depth: number }> = [];
  const zeroHeight: Array<{ name: string; depth: number }> = [];
  const rendered: string[] = [];
  const rootFiber = (rootEl as Record<string, unknown>)[fiberKey] as Fiber | undefined;

  function walkFiber(fiber: Fiber | undefined, d: number): void {
    if (!fiber || d > 60) return;

    const name =
      (fiber.type as { name?: string; displayName?: string })?.name ??
      (fiber.type as { name?: string; displayName?: string })?.displayName ??
      (typeof fiber.type === "string" ? fiber.type : null);

    if (fiber.stateNode?.state?.error) {
      const err = fiber.stateNode.state.error as Error;
      errors.push({
        boundary: (name as string) ?? "Unknown",
        error: err.message,
        stack: err.stack?.split("\n").slice(0, 3).join("\n"),
      });
    }

    if (fiber.tag === 13) {
      const isShowingFallback = fiber.memoizedState !== null;
      if (isShowingFallback) {
        const parent = fiber.return;
        const parentName =
          (parent?.type as { name?: string; displayName?: string })?.name ??
          (parent?.type as { name?: string; displayName?: string })?.displayName ??
          "?";
        suspenseStuck.push({ parent: parentName as string, depth: d });
      }
    }

    if (name && fiber.stateNode?.getBoundingClientRect) {
      const rect = (fiber.stateNode as Element).getBoundingClientRect();
      if (rect.height === 0 && rect.width > 0) {
        zeroHeight.push({ name: name as string, depth: d });
      }
    }

    if (
      name &&
      (name as string).length > 2 &&
      !(name as string).startsWith("_") &&
      fiber.tag <= 2
    ) {
      rendered.push(name as string);
    }

    walkFiber(fiber.child as Fiber | undefined, d + 1);
    walkFiber(fiber.sibling as Fiber | undefined, d);
  }

  walkFiber(rootFiber, 0);

  console.log(
    "\n%c═══ DEEP PANEL DIAGNOSTIC ═══",
    "font-size:14px;font-weight:bold;color:#60a5fa"
  );

  if (errors.length > 0) {
    console.log(
      `\n%c🔴 ${errors.length} ERROR BOUNDARIES CAUGHT ERRORS:`,
      "color:#f87171;font-weight:bold"
    );
    errors.forEach((e, i) => {
      console.log(`\n  ${i + 1}. ${e.boundary}:`);
      console.error(`     ${e.error}`);
      if (e.stack) console.log(`     ${e.stack}`);
    });
  } else {
    console.log("\n%c✅ No error boundaries with caught errors", "color:#4ade80");
  }

  if (suspenseStuck.length > 0) {
    console.log(
      `\n%c🟡 ${suspenseStuck.length} SUSPENSE BOUNDARIES SHOWING FALLBACK:`,
      "color:#fbbf24;font-weight:bold"
    );
    suspenseStuck.forEach((s) =>
      console.log(`  - Inside <${s.parent}> at depth ${s.depth}`)
    );
  } else {
    console.log("\n%c✅ No stuck Suspense boundaries", "color:#4ade80");
  }

  if (zeroHeight.length > 0) {
    console.log(
      `\n%c🟠 ${zeroHeight.length} COMPONENTS WITH ZERO HEIGHT:`,
      "color:#fb923c;font-weight:bold"
    );
    zeroHeight.forEach((z) => console.log(`  - <${z.name}> at depth ${z.depth}`));
  }

  const unique = [...new Set(rendered)];
  console.log(
    `\n%c📋 ${unique.length} COMPONENTS THAT RENDERED:`,
    "color:#94a3b8"
  );
  console.log("  " + unique.join(", "));

  console.log("\n%c═══════════════════════════════", "color:#60a5fa");

  return { errors, suspenseStuck, zeroHeight, renderedComponents: unique };
}

interface Fiber {
  type: unknown;
  tag: number;
  stateNode?: { state?: { error?: Error }; getBoundingClientRect?: () => DOMRect };
  memoizedState: unknown;
  return?: Fiber;
  child?: Fiber;
  sibling?: Fiber;
}

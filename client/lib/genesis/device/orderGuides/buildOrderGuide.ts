import type { MissingSignal } from "@/lib/genesis/device/missingItems/missingSignals";

export function buildOrderGuide(input: {
  propertyName: string;
  generatedAtISO: string;
  items: any[];
  missingSignals: MissingSignal[];
}): string {
  const lines: string[] = [];
  lines.push(`LUCCCA ORDER GUIDE`);
  lines.push(`Property: ${input.propertyName}`);
  lines.push(`Generated: ${input.generatedAtISO}`);
  lines.push(``);
  lines.push(`--- ITEMS (from last plan) ---`);
  if (!input.items || input.items.length === 0) {
    lines.push(`No plan items yet. Run AI procurement first.`);
  } else {
    for (const it of input.items.slice(0, 200)) {
      lines.push(`- ${it.name ?? it.label ?? "Item"}  |  qty: ${it.qty ?? it.quantity ?? "?"}  |  uom: ${it.uom ?? ""}`);
    }
  }
  lines.push(``);
  lines.push(`--- MISSING ITEM SIGNALS ---`);
  if (input.missingSignals.length === 0) lines.push(`No flags.`);
  else for (const m of input.missingSignals) lines.push(`! ${m.label} — ${m.reason}`);
  lines.push(``);
  lines.push(`Notes: Clipboard/physical counting friendly. PDF export can be added next.`);
  return lines.join("\n");
}

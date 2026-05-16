/***
 * LUCCCA — BUILD 25
 * Staffing Calculator
 *
 * PURPOSE:
 *  - Estimate labor needs (FOH/BOH) based on:
 *      - headcount
 *      - service style
 *      - complexity
 *      - duration
 *
 * NOTE:
 *  - Deterministic rules now; can be taught by AI later.
 ***/

export type ServiceStyle = "plated" | "buffet" | "stations" | "reception";

export type StaffingInput = {
  headcount: number;
  style: ServiceStyle;
  durationHours: number;
  complexity: "low" | "medium" | "high";
};

export type StaffingOutput = {
  roles: {
    role: string;
    count: number;
    hoursEach: number;
    totalHours: number;
  }[];
  totalHours: number;
};

export function calculateStaffing(input: StaffingInput): StaffingOutput {
  const { headcount, style, durationHours, complexity } = input;

  const complexityFactor =
    complexity === "low" ? 0.9 : complexity === "medium" ? 1.0 : 1.2;

  let serverRatio = 0.0;
  let captainRatio = 0.0;
  let bartenderRatio = 0.0;
  let bohCookRatio = 0.0;

  switch (style) {
    case "plated":
      serverRatio = 1 / 16;
      captainRatio = 1 / 80;
      bartenderRatio = 1 / 80;
      bohCookRatio = 1 / 40;
      break;
    case "buffet":
      serverRatio = 1 / 25;
      captainRatio = 1 / 100;
      bartenderRatio = 1 / 100;
      bohCookRatio = 1 / 60;
      break;
    case "stations":
      serverRatio = 1 / 18;
      captainRatio = 1 / 60;
      bartenderRatio = 1 / 60;
      bohCookRatio = 1 / 35;
      break;
    case "reception":
      serverRatio = 1 / 30;
      captainRatio = 1 / 120;
      bartenderRatio = 1 / 60;
      bohCookRatio = 1 / 80;
      break;
  }

  function roundUp(n: number) {
    return Math.max(1, Math.ceil(n * complexityFactor));
  }

  const servers = roundUp(headcount * serverRatio);
  const captains = roundUp(headcount * captainRatio);
  const bartenders = roundUp(headcount * bartenderRatio);
  const cooks = roundUp(headcount * bohCookRatio);
  const dish = roundUp(headcount / 80);
  const steward = roundUp(headcount / 120);

  const shiftHours = durationHours + 2;

  const roles = [
    { role: "Server", count: servers, hoursEach: shiftHours },
    { role: "Captain", count: captains, hoursEach: shiftHours },
    { role: "Bartender", count: bartenders, hoursEach: shiftHours },
    { role: "Cook", count: cooks, hoursEach: shiftHours },
    { role: "Dishwasher", count: dish, hoursEach: shiftHours },
    { role: "Steward", count: steward, hoursEach: shiftHours },
  ].map((r) => ({
    ...r,
    totalHours: r.count * r.hoursEach,
  }));

  const totalHours = roles.reduce((sum, r) => sum + r.totalHours, 0);

  return { roles, totalHours };
}

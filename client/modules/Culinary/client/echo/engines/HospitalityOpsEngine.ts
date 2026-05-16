export type ServiceStyle =
  | "casual"
  | "fine_dining"
  | "banquet"
  | "buffet"
  | "room_service";

export interface SeatingPattern {
  numGuests: number;
  numServers: number;
  serviceStyle: ServiceStyle;
  targetTurnMinutes: number;
}

export interface ServiceRiskAssessment {
  understaffed: boolean;
  overbooked: boolean;
  guestExperienceRisk: "low" | "medium" | "high";
  notes: string[];
}

export class HospitalityOpsEngine {
  static assessServiceLoad(pattern: SeatingPattern): ServiceRiskAssessment {
    const { numGuests, numServers, serviceStyle, targetTurnMinutes } = pattern;
    const notes: string[] = [];

    const guestsPerServer = numServers ? numGuests / numServers : Infinity;
    let risk: ServiceRiskAssessment["guestExperienceRisk"] = "low";

    if (serviceStyle === "fine_dining" && guestsPerServer > 6) {
      risk = "high";
      notes.push(
        "Fine dining with >6 guests per server risks degraded experience.",
      );
    } else if (serviceStyle === "casual" && guestsPerServer > 10) {
      risk = "medium";
      notes.push("Casual service with >10 guests per server may feel rushed.");
    } else if (serviceStyle === "banquet" && guestsPerServer > 20) {
      risk = "medium";
      notes.push("Banquet service may require additional support or runners.");
    }

    if (targetTurnMinutes < 60 && serviceStyle === "fine_dining") {
      risk = "high";
      notes.push("Fine dining turn time under 60 minutes is aggressive.");
    }

    const understaffed = risk === "high";
    const overbooked = guestsPerServer > 15;

    return { understaffed, overbooked, guestExperienceRisk: risk, notes };
  }
}

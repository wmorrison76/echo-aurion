export interface GuestVisit {
  guestId: string;
  date: string;
  spend: number;
  satisfactionScore?: number;
  tags: string[];
}

export interface GuestProfileSummary {
  guestId: string;
  totalVisits: number;
  avgSpend: number;
  lifetimeValue: number;
  avgSatisfaction?: number;
  segments: string[];
  personalizationHints: string[];
}

export class CRMEngine {
  static summarizeGuest(visits: GuestVisit[]): GuestProfileSummary | null {
    if (!visits.length) return null;

    const guestId = visits[0].guestId;
    const totalVisits = visits.length;
    const totalSpend = visits.reduce((s, v) => s + v.spend, 0);
    const withScores = visits.filter((v) => v.satisfactionScore != null);
    const avgSatisfaction =
      withScores.length > 0
        ? withScores.reduce((s, v) => s + (v.satisfactionScore ?? 0), 0) /
          withScores.length
        : undefined;

    const allTags = new Set<string>();
    visits.forEach((v) => v.tags.forEach((t) => allTags.add(t)));

    const segments: string[] = [];
    const personalizationHints: string[] = [];

    if (totalSpend > 2000) segments.push("high_value");
    if (avgSatisfaction && avgSatisfaction >= 4.5) segments.push("promoter");
    if ([...allTags].includes("birthday")) segments.push("celebration_guest");

    if (segments.includes("high_value")) {
      personalizationHints.push(
        "Offer proactive greetings and occasional upgrades.",
      );
    }
    if (segments.includes("celebration_guest")) {
      personalizationHints.push("Suggest celebration packages and desserts.");
    }

    return {
      guestId,
      totalVisits,
      avgSpend: totalSpend / totalVisits,
      lifetimeValue: totalSpend,
      avgSatisfaction,
      segments,
      personalizationHints,
    };
  }
}

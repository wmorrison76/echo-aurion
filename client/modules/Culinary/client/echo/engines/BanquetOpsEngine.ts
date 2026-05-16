export interface BanquetCoursePlan {
  courseName: string;
  guestCount: number;
  platingLineStations: number;
  averagePlatesPerMinutePerStation: number;
}

export interface BanquetTimingAssessment {
  courseName: string;
  estimatedServiceMinutes: number;
  withinTarget: boolean;
  notes: string[];
}

export class BanquetOpsEngine {
  static assessCourseTiming(
    plan: BanquetCoursePlan,
    targetMinutes: number,
  ): BanquetTimingAssessment {
    const capacityPerMinute =
      plan.platingLineStations * plan.averagePlatesPerMinutePerStation ||
      0.0001;
    const estimatedServiceMinutes = plan.guestCount / capacityPerMinute;

    const withinTarget = estimatedServiceMinutes <= targetMinutes;
    const notes: string[] = [];

    notes.push(
      `Estimated service time for ${plan.guestCount} guests: ${estimatedServiceMinutes.toFixed(
        1,
      )} minutes.`,
    );

    if (!withinTarget) {
      notes.push(
        "Current line capacity may be insufficient; consider adding stations or staggering service.",
      );
    }

    return {
      courseName: plan.courseName,
      estimatedServiceMinutes,
      withinTarget,
      notes,
    };
  }
}

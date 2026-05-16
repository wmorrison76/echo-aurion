export interface Builder {
  registerComponent: (c: any, opts: any) => void;
}
declare const Builder: Builder | undefined;

export const TimesheetReviewMeta = {
  name: "TimesheetReview",
  inputs: [
    {
      name: "apiUrl",
      type: "string",
      defaultValue: "/api/payroll/weekly_totals",
    },
    { name: "currency", type: "string", defaultValue: "USD" },
  ],
};

if (
  typeof Builder !== "undefined" &&
  Builder &&
  typeof Builder.registerComponent === "function"
) {
  Builder.registerComponent(() => null as any, TimesheetReviewMeta);
}

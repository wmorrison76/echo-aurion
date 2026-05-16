import type { ScheduleDraft, RuleSet, ComplianceReport } from '@data/models';

export const ComplianceKernel = {
  validate(draft: ScheduleDraft, rules: RuleSet): ScheduleDraft & { compliance: ComplianceReport } {
    return { ...draft, compliance: { violations: [] } };
  }
};

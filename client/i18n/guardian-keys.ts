/**
 * i18n Keys for Guardian AI System
 * 
 * All text is i18n-ready with translation keys
 * Keys follow pattern: guardian.{guardian}.{category}.{item}
 */

export const guardianKeys = {
  en: {
    /* Guardian System - General */
    "guardian.title": "AI Guardian System",
    "guardian.description": "4-Layer AI validation for financial transactions",
    "guardian.argus": "Argus Guardian",
    "guardian.zelda": "Zelda Guardian",
    "guardian.phoenix": "Phoenix Guardian",
    "guardian.odin": "Odin Guardian",
    "guardian.status.passed": "Passed",
    "guardian.status.warnings": "Warnings",
    "guardian.status.blocked": "Blocked",
    "guardian.status.critical": "Critical",

    /* Argus Guardian - Errors */
    "guardian.argus.error.no.lines": "Journal entry must have at least one line",
    "guardian.argus.error.account.not.found": "GL Account does not exist",
    "guardian.argus.error.account.inactive": "GL Account is not active",
    "guardian.argus.error.unbalanced": "Debits must equal Credits",
    "guardian.argus.error.both.debit.credit": "Cannot have both debit and credit",
    "guardian.argus.error.no.amount": "Must have either debit or credit amount",
    "guardian.argus.error.negative.amount": "Amounts must be positive",
    "guardian.argus.error.future.date": "Entry date cannot be in the future",
    "guardian.argus.error.invalid.amount": "Invoice amount must be positive",
    "guardian.argus.error.future.invoice.date": "Invoice date cannot be in the future",
    "guardian.argus.error.invalid.due.date": "Due date cannot be before invoice date",
    "guardian.argus.error.missing.vendor": "Vendor ID and name are required",
    "guardian.argus.error.missing.invoice.number": "Invoice number is required",
    "guardian.argus.error.amount.exceeds.max": "Amount exceeds maximum allowed",
    
    /* Argus Guardian - Warnings */
    "guardian.argus.warning.single.line": "Single-line journal entries are unusual",
    "guardian.argus.warning.cost.center.required": "Cost center required for this account",
    "guardian.argus.warning.department.required": "Department required for this account",
    "guardian.argus.warning.old.date": "Entry date is very old",
    "guardian.argus.warning.multiple.currencies": "Multiple currencies detected",
    "guardian.argus.warning.high.risk.account": "High-risk account used",
    "guardian.argus.warning.amount.below.min": "Amount below minimum threshold",
    "guardian.argus.warning.large.amount": "Large amount may require CFO approval",
    "guardian.argus.warning.duplicate.lines": "Duplicate line items detected",
    "guardian.argus.warning.poor.description": "Description is too short or missing",
    "guardian.argus.warning.mixed.account.types": "Unusual: Mixing revenue and expense accounts",
    "guardian.argus.warning.round.number": "Round number amount may indicate fraud",
    "guardian.argus.warning.unusual.debit": "Unusual debit to this account type",
    "guardian.argus.warning.unusual.credit": "Unusual credit to this account type",
    "guardian.argus.warning.inter.company": "Multiple cost centers may indicate inter-company transaction",
    "guardian.argus.warning.gaap.compliance": "GAAP compliance issue detected",
    "guardian.argus.warning.low.ocr": "OCR confidence low - Manual review recommended",
    "guardian.argus.warning.old.invoice": "Invoice date is very old",
    "guardian.argus.warning.long.payment.terms": "Unusual payment terms detected",
    "guardian.argus.warning.invalid.currency": "Invalid or missing currency",
    "guardian.argus.warning.very.large.amount": "Very large invoice amount",
    "guardian.argus.warning.rounding.variance": "Minor rounding variance detected",

    /* Argus Guardian - Recommendations */
    "guardian.argus.recommendation.cfo.approval": "Consider CFO approval for amounts over $100,000",
    "guardian.argus.recommendation.large.invoice.approval": "Consider additional approval for invoices over $1M",

    /* Zelda Guardian - Duplicates */
    "guardian.zelda.duplicate.exact": "Exact duplicate detected",
    "guardian.zelda.duplicate.transposed": "Possible transposed amount",
    "guardian.zelda.duplicate.fuzzy": "Possible duplicate with different vendor ID",
    "guardian.zelda.warning.similar.amounts": "Similar amounts detected",
    "guardian.zelda.success.no.duplicates": "No duplicates detected",
    "guardian.zelda.warning.duplicates.found": "Duplicates detected - review recommended",
    "guardian.zelda.autoheal.rounding": "Auto-corrected rounding difference",

    /* Phoenix Guardian - Anomalies */
    "guardian.phoenix.anomaly.large.amount": "Large amount anomaly detected",
    "guardian.phoenix.anomaly.off.hours": "Posted outside business hours",
    "guardian.phoenix.anomaly.weekend": "Weekend posting detected",
    "guardian.phoenix.anomaly.round.number": "Round number amount may indicate fraud",
    "guardian.phoenix.anomaly.rapid.succession": "Rapid succession of identical amounts",
    "guardian.phoenix.anomaly.unusual.accounts": "Unusual account combination detected",
    "guardian.phoenix.success.no.anomalies": "No anomalies detected",
    "guardian.phoenix.warning.anomalies.found": "Anomalies detected - review recommended",
    "guardian.phoenix.success.rollback.prepared": "Rollback prepared successfully",
    "guardian.phoenix.rollback.reason": "Rollback reason",

    /* Phoenix Guardian - Fraud Indicators */
    "guardian.phoenix.fraud.round.number": "Round number amount (possible fraud)",
    "guardian.phoenix.fraud.rapid.succession": "Rapid succession of identical amounts",

    /* Phoenix Guardian - Recommendations */
    "guardian.phoenix.recommendation.critical.review": "CRITICAL: Immediate manual review required",
    "guardian.phoenix.recommendation.block.until.review": "Consider blocking transaction until review complete",
    "guardian.phoenix.recommendation.high.risk.review": "HIGH RISK: Manual review recommended",
    "guardian.phoenix.recommendation.moderate.risk": "MODERATE RISK: Additional approval may be required",

    /* Odin Guardian */
    "guardian.odin.success.logged": "Audit trail created successfully",
    "guardian.odin.success.integrity.verified": "All transactions verified - no tampering detected",
    "guardian.odin.error.integrity.issues": "Integrity issues detected - investigation required",
    "guardian.odin.success.report.generated": "Audit report generated successfully",
    "guardian.odin.recommendation.integrity.issue": "Audit trail integrity issues detected - investigation recommended",

    /* EchoAI^3 Insights */
    "guardian.echoai3.recommendation.critical.block": "CRITICAL: Transaction should be blocked and reviewed immediately",
    "guardian.echoai3.recommendation.high.risk.review": "HIGH RISK: Manual review strongly recommended before posting",
    "guardian.echoai3.recommendation.moderate.risk": "MODERATE RISK: Review warnings before posting",
    "guardian.echoai3.recommendation.auto.healed": "AUTO-HEALED: Minor data quality issues were automatically corrected",
    "guardian.echoai3.recommendation.safe": "SAFE: Transaction appears valid and can be posted",
    "guardian.echoai3.reasoning.multiple.indicators": "Multiple high-risk indicators detected across all Guardian layers",
    "guardian.echoai3.reasoning.significant.risk": "Significant risk indicators detected - additional approval recommended",
    "guardian.echoai3.reasoning.some.risk": "Some risk indicators present - proceed with caution",
    "guardian.echoai3.reasoning.auto.healed": "Data quality issue(s) automatically resolved",
    "guardian.echoai3.reasoning.all.passed": "All Guardian checks passed with low risk scores",

    /* Guardian API */
    "guardian.api.success.passed": "Transaction passed all Guardian checks",
    "guardian.api.warning.issues": "Transaction has issues that need attention",
    "guardian.api.error.missing.params": "Missing required parameters",
    "guardian.api.error.missing.invoices": "Invoices array is required",
    "guardian.api.error.missing.entries": "Entries array is required",
    "guardian.api.error.missing.action": "Action is required",
    "guardian.api.error.missing.orgId": "Organization ID is required",
    "guardian.api.error.generic": "Failed to validate transaction",
    "guardian.api.error.argus": "Failed to run Argus checks",
    "guardian.api.error.zelda": "Failed to run Zelda checks",
    "guardian.api.error.phoenix": "Failed to run Phoenix checks",
    "guardian.api.error.odin": "Failed to log audit trail",
    "guardian.api.error.integrity": "Failed to verify integrity",
    "guardian.api.error.report": "Failed to generate audit report",
    "guardian.api.error.rollback": "Failed to prepare rollback",
    "guardian.argus.success.passed": "Argus checks passed",
    "guardian.argus.error.failed": "Argus checks failed",
  },
  
  es: {
    /* Spanish translations - to be completed */
    "guardian.title": "Sistema Guardian AI",
    "guardian.argus": "Guardian Argus",
    "guardian.zelda": "Guardian Zelda",
    "guardian.phoenix": "Guardian Phoenix",
    "guardian.odin": "Guardian Odin",
  },
  
  fr: {
    /* French translations - to be completed */
  },
  
  de: {
    /* German translations - to be completed */
  },
  
  ja: {
    /* Japanese translations - to be completed */
  },
  
  pt: {
    /* Portuguese translations - to be completed */
  },
};

/**
 * Helper function to get Guardian translation key
 */
export function getGuardianKey(key: string, lang: string = 'en'): string {
  const translations = guardianKeys[lang as keyof typeof guardianKeys] || guardianKeys.en;
  return translations[key as keyof typeof translations] || key;
}

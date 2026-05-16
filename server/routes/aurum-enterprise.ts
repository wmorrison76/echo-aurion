import { Router } from "express";

import { requireSession } from "../../client/modules/EchoAurum/server/middleware/session";
import { GUARDRAIL_IDS } from "../../client/modules/EchoAurum/server/services/session";

import { handleInvoiceWorkflow } from "../../client/modules/EchoAurum/server/routes/apWorkflow";
import { handlePurchasingDashboard } from "../../client/modules/EchoAurum/server/routes/purchasing";
import { handleVarianceInsights } from "../../client/modules/EchoAurum/server/routes/insights";

const router = Router();

router.post(
  "/ap/workflow",
  requireSession({
    role: "controller",
    guardrails: [GUARDRAIL_IDS.AP_RELEASE],
  }),
  handleInvoiceWorkflow,
);

router.post(
  "/purchasing/dashboard",
  requireSession({
    role: "controller",
    guardrails: [GUARDRAIL_IDS.AP_RELEASE],
  }),
  handlePurchasingDashboard,
);

router.post(
  "/insights/variance",
  requireSession({ role: "auditor" }),
  handleVarianceInsights,
);

export default router;

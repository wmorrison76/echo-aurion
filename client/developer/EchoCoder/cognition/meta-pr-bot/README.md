# Meta PR Bot

The meta PR bot drafts pull requests on Echo's behalf. It converts SARIF findings and validation checklists into a human-readable summary while reminding reviewers that approval is still required.

```ts
import { createAutoPr } from "@/cognition/meta-pr-bot/autoprs";

const payload = createAutoPr({
  title: "feat: add event order guide generator",
  summary: "Implements automated order guides for five dessert recipes.",
  branch: "feature/order-guide-generator",
  findings: [
    { ruleId: "SAST001", level: "warning", message: "Ensure secrets are pulled from Vault" },
  ],
});
```

Feed the payload into your VCS API (GitHub, GitLab, etc.) and enforce guardrails from `policies/guardrails.rego` so Echo cannot merge without a human.

# Echo AI³ Core Installation

This guide summarizes the contents of the core package and the steps required to integrate it into an existing Builder.io project.

## Package Contents

- `policies/` – Authorization model and guardrail policies that keep EchoBot in a PR-only posture.
- `schemas/` – JSON schema definitions used across ordering, inventory, and analytics services.
- `orchestrator/` – Project bootstrap utilities for wiring new LUCCCA workspaces.
- `client/components/admin/` – Operator-facing admin console widgets (approvals, audit logs, empathy controls).
- `secrets/` – Vault templates and credential wiring guidance.
- `tests/` – Validation tests that enforce schema integrity.
- `docs/` – Supplemental documentation, including this installation reference.
- `scripts/install_core.sh` – Helper script that copies the package onto an existing repository.

## Installation Steps

1. Download the package archive and extract it alongside your project repository.
2. From the root of your project, run `bash scripts/install_core.sh .`.
3. Review the generated policies and adjust any organization-specific naming or role mappings.
4. Import the JSON schemas into your data pipeline or API validation layer.
5. Mount the admin UI components wherever operator visibility is required (for example, inside the Echo control surface).
6. Configure Vault using `secrets/vault-template.yaml` and register the OPA policies with your existing CI.
7. Execute `npm install` to ensure new dependencies such as Ajv are installed, then run `npm test` to verify schema compliance.

Once the core package is in place you can proceed with the cognition and security wiring bundles to complete the Year-One-Ahead foundation.

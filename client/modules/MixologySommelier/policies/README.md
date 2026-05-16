# Policy Pack

This directory contains baseline authorization and guardrail policies for the Echo AI³ core installation.

- `authz.model.yaml` captures organization roles, allowed actions, and rule metadata that the orchestrator imports when scaffolding a new project.
- `guardrails.rego` is evaluated in CI to make sure protected actions require human review and that EchoBot cannot modify authentication or CI pipelines directly.

Integrate these policies with your preferred policy engine (OPA, Conftest, or the existing guard service) and add environment-specific overrides in a separate `overrides/` directory to prevent accidental edits during upgrades.

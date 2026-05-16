# Echo AI³ Security Hardening

This add-on wires CI guardrails, Vault access controls, and ZARO policy baselines so EchoBot remains a supervised assistant.

## Checklist

1. **Continuous Integration**
   - GitHub: `.github/workflows/echo-ci.yml` runs tests, validates guardrails, and scans for secrets.
   - GitLab: `.gitlab-ci.yml` mirrors the validation steps for self-hosted runners.
   - Update token permissions if your repository requires additional scopes.

2. **Secret Scanning**
   - `.config/gitleaks.toml` defines high-signal patterns for API keys, JWTs, and PEM credentials.
   - Extend the allowlist section when adding generated fixtures or mock data.

3. **Policy Enforcement**
   - `policies/guardrails.rego` plus `opa/opa-input.template.json` allow CI to block unreviewed sensitive changes.
   - Run `pnpm exec opa eval --input opa/opa-input.template.json -d policies/guardrails.rego "data.guardrails.allow"` locally before opening a PR.

4. **Vault Integration**
   - `scripts/setup_vault_oidc.sh` installs a KV secrets engine at `kv/echo` and provisions an OIDC role with a one-hour TTL.
   - `scripts/rotate_tokens.sh` revokes outstanding tokens. Execute it from a privileged workstation during incident response.

5. **ZARO Zero-Trust Baseline**
   - `zaro/security/baseline.yaml` keeps EchoBot in a prepare-only posture.
   - Register the policy via `scripts/register_zaro_policies.sh` supplying `ZARO_URL` and `ZARO_TOKEN`.

6. **Builder Actions**
   - `builder/actions/startEventOrder.ts` and `builder/actions/approvePO.ts` emit structured payloads for human approval.
   - Map the actions inside Builder workflows to keep “Send” buttons under manual control.

Review and adapt these assets for each environment. Never grant EchoBot direct deploy or purchasing capabilities without an explicit human gate.

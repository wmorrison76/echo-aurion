# Echo AI³ Cognition Pack Installation

The cognition pack ships the self-learning, simulation, and creative tooling required for Echo AI³ to reason safely inside LUCCCA. Install it after the core pack has been applied.

## Contents

```
cognition/
├── capability-graph/        # Capability manifest parser and relationship graph utilities
├── cognitive-mesh/          # Cross-domain mesh queries for orchestration
├── cultural-interpreter/    # Etiquette and localization knowledge base
├── dream-forge/             # Creative background worker and prompt pipelines
├── empathy-engine/          # Tone modulation reference assets
├── meta-pr-bot/             # Automated pull-request author with guardrails
├── neural-meta-loop/        # Self-evaluation daemon and journaling assets
├── simulator/               # Synthetic kitchen environments for policy rehearsal
├── vector-memory/           # Connectors to pgvector / external embedding stores
└── safety-manifest.yaml     # Declares sandbox requirements for cognition services
```

## Installation

1. Download the cognition package and extract it next to your project repository.
2. From your project root run `bash scripts/install_cognition.sh .`.
3. Review `cognition/safety-manifest.yaml` and register the services with your runtime policy engine.
4. Configure environment variables for the simulator, dream forge, and vector memory connectors (see respective README files).
5. Wire the exported TypeScript utilities into the orchestrator or Builder actions.
6. Enable nightly jobs for the Python daemons using your preferred scheduler (GitHub Actions, Airflow, etc.).

## Post-Install Checklist

- [ ] Register vector-memory credentials and confirm embeddings can be written.
- [ ] Enable neural-meta-loop log ingestion (point it at CI and operations logs).
- [ ] Run `npm run test` to ensure new TypeScript utilities type-check.
- [ ] Execute `python cognition/neural-meta-loop/daemon.py --dry-run` to validate environment configuration.
- [ ] Schedule the dream forge worker for creative artifact generation.

After completing these steps proceed with the security wiring pack to lock in Vault/OIDC and CI guardrails.

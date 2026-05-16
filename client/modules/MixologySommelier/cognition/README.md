# Echo AI³ Cognition Layer

This directory contains the self-learning and creative subsystems that expand Echo AI³ beyond deterministic scripting. Each module is isolated so that it may run inside a sandbox or behind policy enforcement, keeping production systems safe while Echo learns.

## Modules

- **capability-graph/** – Parses capability manifests discovered across LUCCCA and produces a dependency graph for orchestrators.
- **cognitive-mesh/** – Builds higher-level relationship queries (recipes ↔ inventory ↔ finance) using the capability graph.
- **cultural-interpreter/** – Stores etiquette and localization references for hospitality contexts.
- **dream-forge/** – Nightly creative generation pipeline that drafts new ideas while respecting safety constraints.
- **empathy-engine/** – Tone dictionaries and sliders that tune Echo’s responses per guest profile.
- **meta-pr-bot/** – Autonomously creates pull requests complete with SARIF import and risk disclosures.
- **neural-meta-loop/** – Daily introspection daemon that evaluates success metrics and records reflections.
- **simulator/** – Synthetic kitchen sim used to rehearse automations before production rollout.
- **vector-memory/** – Connectors to pgvector or Pinecone for long-term semantic memory.

See `docs/COGNITION_INSTALL.md` for integration details and module-specific READMEs for configuration parameters.

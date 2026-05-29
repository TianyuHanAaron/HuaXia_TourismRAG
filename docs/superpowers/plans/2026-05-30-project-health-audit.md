# Project Health Audit

## Purpose

This audit catches project-level bugs before demos or deployment:

- malformed JSON / JSONL fixtures
- missing structured-data row files referenced by manifests
- duplicate or broken production source-registry entries
- local-cuisine rows that accidentally reintroduce redundant district metadata
- stale references to removed data/integration surfaces
- missing manual evaluation fixtures used by demo QA

## Runbook

```bash
uv run huaxia-tourismrag project-health --root .
uv run huaxia-tourismrag project-health --root . --raw
uv run huaxia-tourismrag project-health --root . --fail-on-warning
```

Use this before:

- rebuilding the internal RAG index
- deploying Streamlit / API changes
- recording a hackathon demo
- committing a large data or importer change

The command exits non-zero for errors. Warnings are advisory by default and can be
promoted to failures with `--fail-on-warning`.

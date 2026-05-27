# Internal Data Layout

This folder is organized as a small data pipeline for HuaXia Tourism RAG.

```text
data/internal/
  corpora/      Generated JSONL corpora that can be indexed into Qdrant.
  manifests/    Source manifests. These define source metadata and point to row files.
  registries/   Production acquisition registries for future national-scale imports.
  rows/
    seed/       Draft curated rows kept as reference material, not active by default.
    production/ National or province-scale structured rows used for real coverage.
```

## What To Edit

Edit row files under `rows/` when adding structured data.

- `rows/seed/` is for curated examples and route anchors during prototyping.
- `rows/production/` is for official or high-authority national/provincial datasets.

Do not manually edit generated files under `corpora/` unless debugging. Rebuild them from manifests:

```bash
uv run huaxia-tourismrag build-all-structured-corpora
```

Then refresh Qdrant:

```bash
EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 QDRANT_TIMEOUT_SECONDS=120 \
uv run huaxia-tourismrag index-all-internal --recreate
```

## Current Coverage

- `rows/production/china_5a_scenic_rows.json`: official national 5A scenic-area rows.
- `rows/production/china_4a_3a_selected_scenic_rows.json`: official Chongqing 4A/3A scenic-area rows, used as the first province-level non-5A production slice.
- `rows/production/china_national_heritage_rows.json`: official national protected heritage rows from the State Council eighth-batch notice reprinted by the National Forestry and Grassland Administration, plus official Hebei rows from the provincial cultural heritage authority.
- `rows/production/china_local_cuisine_rows.json`: official local-cuisine rows parsed from Ministry of Culture and Tourism intangible-food route pages.
- `rows/production/china_agricultural_gi_specialty_rows.json`: official agricultural-GI specialty rows parsed from the Ministry of Agriculture notice, plus official provincial agriculture rows.

Refresh the official production rows with:

```bash
uv run huaxia-tourismrag import-official-production-sources
uv run huaxia-tourismrag build-all-structured-corpora
```

## Minimum Business Baseline

Before re-indexing, keep at least 10 priority provinces covered across these
internal-knowledge layers:

- 5A/4A/3A scenic and destination rows.
- National or high-value heritage-site rows.
- Local cuisine, specialties, and agricultural GI rows.
- Basic tourism law, railway, transport, insurance, medical, and safety rules.

Curated seed rows are kept as drafts only; active manifests should prefer
official or high-authority production rows. Validate the current generated
corpora before indexing:

```bash
uv run huaxia-tourismrag inspect-internal-coverage
```

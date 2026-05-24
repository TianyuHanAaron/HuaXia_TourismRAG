# Internal Data Layout

This folder is organized as a small data pipeline for HuaXia Tourism RAG.

```text
data/internal/
  corpora/      Generated JSONL corpora that can be indexed into Qdrant.
  manifests/    Source manifests. These define source metadata and point to row files.
  registries/   Production acquisition registries for future national-scale imports.
  rows/
    seed/       Small curated rows used to test product behavior and theme routes.
    production/ National or province-scale structured rows used for real coverage.
```

## What To Edit

Edit row files under `rows/` when adding structured data.

- `rows/seed/` is for curated examples and route anchors.
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
- `rows/production/china_national_heritage_rows.json`: official Hebei national protected heritage rows from the provincial cultural heritage authority.
- `rows/production/china_time_honored_brand_rows.json`: empty target for China Time-Honored Brand rows.
- `rows/production/china_agricultural_gi_specialty_rows.json`: official Hunan agricultural GI specialty rows from the provincial agriculture authority.

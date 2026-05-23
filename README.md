# HuaXia Tourism RAG

HuaXia Tourism RAG is a Chinese domestic-travel RAG service for itinerary planning, live travel research, and multi-turn clarification. It is designed around Chinese tourists, Chinese web sources, and travel-agency style planning: routes, transport logic, accommodation areas, local food, attraction tradeoffs, booking checks, and citation-backed answers.

The assistant persona is "夏夏", the HuaXia travel agency AI consultant.

## What It Does

- Answers conventional Chinese tourism questions through `POST /tourism/questions`.
- Generates highly customized DIY routes through `POST /tourism/itineraries/diy`.
- Supports multi-hop clarification sessions when a request is too ambiguous to answer well.
- Searches the web with Tavily or Exa, then parses pages with Firecrawl or a trafilatura fallback.
- Retrieves internal curated travel documents from Qdrant.
- Uses Redis to persist pending clarification sessions.
- Provides a Typer CLI for fast local testing.
- Uses strict Pydantic DTOs for request/response shape.
- Filters evidence relevance so citations are tied to parsed web or internal source material rather than unrelated filler.

## Project Layout

```text
.
├── data/
│   └── internal/verified_china_tourism_seed.jsonl
├── src/huaxia_tourismrag/
│   ├── agents/
│   │   ├── diy_itinerary_planner.py
│   │   ├── research_planner.py
│   │   ├── tourism_agent.py
│   │   └── travel_checkpoints.py
│   ├── api/routes.py
│   ├── bootstrap.py
│   ├── cli.py
│   ├── core/config.py
│   ├── indexing/
│   ├── rag/
│   ├── schemas/
│   ├── services/
│   ├── tools/
│   └── vector/
├── tests/
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

## Core Architecture

```text
User question
  ↓
FastAPI route or CLI
  ↓
Travel checkpoint service
  ├─ if essential details are missing: create Redis pending session
  └─ if enough context exists: continue
  ↓
Research planner agent
  ↓
Internal RAG retrieval from Qdrant
  +
Fresh web search from Tavily/Exa
  +
Webpage parsing with Firecrawl/trafilatura
  ↓
Evidence merge, relevance filtering, reranking
  ↓
Citation formatter
  ↓
Tourism answer agent
  ↓
TravelAnswer DTO
```

There are two main answer flows:

- **Conventional question flow:** For normal travel requests, from short prompts to detailed requests such as family trips, province-level deep travel, budget planning, attraction selection, and route advice.
- **DIY itinerary flow:** For unusual user-defined routes or themes that are not commonly sold as standard travel-agency products, such as a self-designed 三国历史巡礼 route across many cities.

Both flows return the same `TravelAnswer` response format.

## Requirements

- Python `3.11+`
- `uv`
- Qdrant
- Redis
- OpenAI-compatible model access through PydanticAI
- Tavily or Exa API key
- Firecrawl API key

Optional but useful:

- Docker or Docker Compose for Qdrant and Redis
- Hugging Face model cache for local embeddings/reranking

## Setup

Clone and install dependencies:

```bash
git clone https://github.com/TianyuHanAaron/HuaXia_TourismRAG.git
cd HuaXia_TourismRAG
uv sync
```

Create your local env file:

```bash
cp .env.example .env
```

Fill in `.env` with your real keys. Do not commit `.env`.

Recommended local model setting while developing:

```env
ENABLE_MODEL_RERANKER=false
```

This keeps responses faster and avoids local GPU/MPS memory issues during testing.

To avoid the PydanticAI `openai:` deprecation warning, prefer:

```env
TOURISM_AGENT_MODEL=openai-chat:gpt-5.5
```

Use the actual model name available in your account.

## Environment Variables

See `.env.example` for the complete list.

Important variables:

```env
APP_NAME="HuaXia Tourism RAG"

TOURISM_AGENT_MODEL=openai-chat:gpt-5.5

SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_tavily_api_key_here
EXA_API_KEY=your_exa_api_key_here

FIRECRAWL_API_KEY=your_firecrawl_api_key_here

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=tourism_internal_docs

REDIS_URL=redis://localhost:6379/0
SESSION_TTL_SECONDS=86400

EMBEDDING_MODEL=BAAI/bge-m3
RERANKER_MODEL=BAAI/bge-reranker-v2-m3
ENABLE_MODEL_RERANKER=false
MAX_MODEL_RERANK_CANDIDATES=6

MAX_SEARCH_RESULTS=8
MAX_PAGES_TO_READ=6
TOP_K_CONTEXTS=4
MIN_RERANKER_SCORE=0.05
```

## Start Local Services

With Docker:

```bash
docker compose up -d qdrant redis
```

If Docker is unavailable on macOS, Redis can be started with Homebrew:

```bash
brew install redis
brew services start redis
redis-cli ping
```

For Qdrant without Docker, use Qdrant Cloud or another local Qdrant installation and set `QDRANT_URL` accordingly.

## Run the API

Load env vars and start FastAPI:

```bash
set -a
source .env
set +a

uv run uvicorn huaxia_tourismrag.main:app --reload --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/tourism/health
```

Capabilities:

```bash
curl http://127.0.0.1:8000/tourism/capabilities
```

## API Usage

### Conventional Travel Question

Use this for normal travel questions, whether short or detailed.

```bash
curl -X POST http://127.0.0.1:8000/tourism/questions \
  -H "Content-Type: application/json" \
  -d '{
    "question": "我想陪爸妈去海南岛玩7天，预算三个人总共1万左右，希望不要太累，帮我安排路线、住宿区域、美食和需要提前确认的事项。"
  }'
```

Optional structured context can also be supplied:

```json
{
  "question": "第一次去北京三天两晚怎么玩？",
  "destination": "北京",
  "travelers": 2,
  "budget_level": "mid_range",
  "interests": ["故宫", "胡同", "本地美食"],
  "language": "zh-CN"
}
```

### DIY Itinerary Question

Use this only for user-designed routes or unusual themes where the route is not a standard travel-agency product.

```bash
curl -X POST http://127.0.0.1:8000/tourism/itineraries/diy \
  -H "Content-Type: application/json" \
  -d '{
    "question": "三国历史巡礼，从北京出发，路线必须包含涿州、安阳、许昌、南阳、咸宁、南京、成都、汉中，10到12天，可以按交通合理性调整顺序。"
  }'
```

### Multi-Hop Clarification Reply

If the service returns `needs_reply: true`, answer the clarification with:

```bash
curl -X POST http://127.0.0.1:8000/tourism/sessions/<SESSION_ID>/reply \
  -H "Content-Type: application/json" \
  -d '{
    "message": "平衡旅行型：三国主题必须覆盖，但每个城市也可以加入最值得去的文化景点和本地美食。交通优先高铁，必要时包车，10到12天都可以。"
  }'
```

## CLI Usage

The package exposes a CLI:

```bash
uv run huaxia-tourismrag --help
```

### Interactive Chat

```bash
uv run huaxia-tourismrag chat
```

The CLI caches the latest pending `session_id`, so if 夏夏 asks a follow-up question, you can reply naturally without copying the ID.

### Ask a Normal Travel Question

```bash
uv run huaxia-tourismrag ask "我想陪爸妈去海南岛玩7天，预算三个人总共1万左右，希望不要太累。"
```

Print raw JSON:

```bash
uv run huaxia-tourismrag ask "第一次去北京三天两晚怎么玩？" --raw --timeout 600
```

### Ask a DIY Route Question

```bash
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，经涿州、安阳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。"
```

### Reply to a Pending Session

If there is a cached pending session:

```bash
uv run huaxia-tourismrag reply "我更想平衡旅行型，三国主题必须覆盖，也要加入本地美食。"
```

Or pass the session ID explicitly:

```bash
uv run huaxia-tourismrag reply <SESSION_ID> "我更想平衡旅行型，交通优先高铁，必要时包车。"
```

### Health Check

```bash
uv run huaxia-tourismrag health
```

## Internal Documents and Qdrant

The seed file lives at:

```text
data/internal/verified_china_tourism_seed.jsonl
```

The project includes an `InternalDocumentIndexer` for loading JSONL, chunking documents, embedding text, and upserting chunks into Qdrant.

The expected JSONL rows map to the internal raw document DTO used by the indexer. For production, prefer verified sources such as official tourism boards, scenic-area official sites, museum sites, transport authorities, and trusted Chinese travel platforms.

Before querying internal docs, the Qdrant collection must exist and be indexed. If Qdrant returns an error such as:

```text
Collection `tourism_internal_docs` doesn't exist
```

then the internal seed documents have not been indexed yet.

If Qdrant returns an error about a missing `tenant_id` index, create the payload index in Qdrant or call the store's collection setup method before querying.

## Citations

The system is intended to cite only evidence that came from parsed web pages or internal curated documents.

Good citation behavior:

- Cite Tavily/Exa result pages only when their content was parsed and used.
- Prefer official scenic-area, museum, railway, airport, hotel, and government sources for operational facts.
- Use blogs and OTAs mainly for travel experience, route inspiration, hotel area hints, food discovery, and hidden-gem context.
- Avoid using unrelated generic citations to support a specific itinerary claim.

## Development

Run lint:

```bash
uv run ruff check src/huaxia_tourismrag tests
```

Run tests:

```bash
uv run pytest -q
```

Current test suite covers:

- API routes
- CLI behavior
- research planner
- DIY itinerary planner
- multi-hop checkpoint logic
- Redis session store
- session reply service
- Qdrant store mapping
- web search providers
- webpage reader
- citation formatter
- evidence merge and relevance filtering
- reranker fallback behavior

## Troubleshooting

### Redis Connection Refused

Error:

```text
redis.exceptions.ConnectionError: Error 61 connecting to localhost:6379
```

Start Redis:

```bash
brew services start redis
redis-cli ping
```

or:

```bash
docker compose up -d redis
```

### Qdrant Collection Missing

Error:

```text
Collection `tourism_internal_docs` doesn't exist
```

Start Qdrant and index internal documents before using internal RAG.

```bash
docker compose up -d qdrant
```

### Reranker Too Slow or Out of Memory

For local testing:

```env
ENABLE_MODEL_RERANKER=false
```

If enabling the model reranker, keep:

```env
MAX_MODEL_RERANK_CANDIDATES=6
```

and lower it further if your local machine runs out of memory.

### Request Timeout

Use a larger CLI timeout:

```bash
uv run huaxia-tourismrag ask "..." --timeout 600
```

Also consider lowering:

```env
MAX_SEARCH_RESULTS=5
MAX_PAGES_TO_READ=3
TOP_K_CONTEXTS=4
```

## Security Notes

- `.env` is ignored and must not be committed.
- Use `.env.example` for safe configuration examples.
- The placeholder auth in `api/routes.py` is for local development only. Replace it with JWT/session validation before production.
- Treat user travel requests as leads only after explicit user consent.
- For production booking workflows, connect the API to your official booking form, CRM, or email pipeline rather than letting the model directly complete payment-sensitive actions.

## Production Roadmap

Recommended next steps:

- Add authenticated users and real tenant identity.
- Add lead capture endpoint for users who want a human travel consultant.
- Add official website redirect or email/CRM handoff for booking requests.
- Add source authority scoring for official scenic-area pages and transport operators.
- Add cache for parsed web pages and official status checks.
- Add observability for search cost, parse failure rate, latency, and citation quality.
- Add a frontend chat interface with stateful session continuation.
- Consider a company MCP server only when other AI clients or internal tools need standardized access to agency inventory, CRM, lead creation, booking status, or itinerary templates.

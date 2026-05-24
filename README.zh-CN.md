# 华夏旅游 RAG

**语言:** [English](README.md) | 简体中文

华夏旅游 RAG 是面向 **华夏旅行社** 打造的专属 Agentic Web-Augmented RAG 平台。它不是一个普通旅游问答 Demo，而是一个面向旅行咨询、售前规划、线索筛选、人工顾问交接和未来预订转化的智能旅行顾问底座。

系统围绕中国国内游客和中国旅游运营场景设计，重点处理路线逻辑、交通可行性、住宿区域、本地美食、景点取舍、政策约束、预订核验、风险提醒和旅行社式行程表达。

系统中的 AI 旅行顾问名为「夏夏」，定位为华夏旅行社的专属智能顾问。夏夏的语气不走冷冰冰工具风，而是更接近年轻用户愿意互动的旅行顾问：友好、轻松、有陪伴感，同时保留旅行社服务所需的专业度。

## 商业定位

本项目的目标不是替代通用大模型，而是沉淀华夏旅行社自己的 AI 咨询入口：

- **售前旅行顾问**：帮助用户澄清去哪儿、玩几天、和谁去、预算多少、交通偏好、住宿风格、饮食兴趣和风险约束。
- **定制行程引擎**：既能处理常规旅行咨询，也能处理旅行社标准产品覆盖不足的个性化、自定义主题路线。
- **实时网页增强研究助手**：通过 Tavily/Exa 搜索并解析网页，为景区状态、交通规则、住宿区域、美食线索和小众玩法提供更新依据。
- **内部政策记忆库**：在 Qdrant 中检索旅游法律法规、交通规则、消费者保护、保险、医疗、海关、安全和监管资料。
- **引用可追溯规划**：回答中的具体依据应来自已解析网页或内部索引资料，减少无来源、错来源和泛泛而谈。
- **旅行社工作流底座**：为后续官网跳转、邮箱/CRM 线索收集、人工顾问接管和预订流程对接打基础。

## 核心能力

- 常规旅游问答：通过 `POST /tourism/questions` 处理普通旅行咨询。
- DIY 定制路线：通过 `POST /tourism/itineraries/diy` 处理小众主题、自定义城市顺序、非标准旅行社产品路线。
- 多轮澄清：当用户信息不足时，系统会先追问关键问题，而不是直接生成低质量方案。
- 品牌化助手语气：通过「夏夏」这一华夏旅行社专属 AI 旅行顾问形象，形成更自然的用户交互体验。
- 实时搜索：支持 Tavily 或 Exa 作为搜索入口。
- 网页解析：优先使用 Firecrawl，失败时回退到 trafilatura。
- 内部知识库：使用 Qdrant 存储和检索已验证资料，目前重点覆盖官方旅游、交通、法律、监管、安全、消费者保护、医疗、保险、海关和金融类出行规则。
- 会话状态：使用 Redis 保存待补充信息的多轮会话。
- 命令行工具：提供 Typer CLI，支持本地测试、多轮续聊、语料构建和 Qdrant 索引。
- 严格 DTO：输入和输出由 Pydantic schema 约束，便于后续前端、CRM、订单系统对接。
- 引用过滤：优先保留与问题相关的网页和内部资料，减少无关引用污染回答。

## 项目结构

```text
.
├── data/
│   └── internal/
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

## 系统架构

```text
用户问题
  ↓
FastAPI 路由或 CLI
  ↓
旅行需求检查服务
  ├─ 信息不足：创建 Redis 待回复会话
  └─ 信息足够：进入规划流程
  ↓
Research Planner Agent
  ↓
Qdrant 内部知识库检索
  +
Tavily/Exa 实时网页搜索
  +
Firecrawl/trafilatura 网页解析
  ↓
证据合并、相关性过滤、重排
  ↓
引用格式化
  ↓
Tourism Answer Agent
  ↓
TravelAnswer DTO
```

系统目前有两个主要回答流程：

- **常规旅行问答流程**：适用于普通旅行问题，可以是简短问题，也可以是详细需求，例如家庭出游、省域深度游、预算规划、景点选择、路线建议等。
- **DIY 路线流程**：适用于用户自己设计的特殊路线或主题路线，例如跨多个城市的三国历史巡礼、宝鸡-天水-陇南-广元-汉中闭环自驾等。

两个流程都返回同一个 `TravelAnswer` 输出结构，方便前端统一渲染。

系统采用“Agentic 但受控”的架构：planner agent 将用户意图拆成研究任务，工具层从内部知识库和实时网页收集证据，checkpoint 逻辑在关键信息不足时追问，最终 answer agent 在严格 DTO 约束下生成可渲染结果。

## 当前产品差异点

- **默认服务中国国内游客**：除非用户明确说明，否则系统不假设游客是外国人。
- **定制路线护城河**：DIY endpoint 面向不常见的主题路线、自定义城市组合和非标准旅行社产品。
- **实时性优先**：开放时间、闭园维护、交通规则、预约等运营事实应优先参考最新官方网页，而不是陈旧内部资料。
- **来源权威排序**：景区、博物馆、政府、铁路、机场、航空、交通运营商来源应优先于博客和 OTA 页面支撑运营事实。
- **多轮澄清能力**：Redis 会话支持在生成方案前追问最关键的缺失信息，避免用户一句话模糊需求直接生成低质量行程。
- **回答深度可控**：用户或前端可以指定 `concise`、`standard`、`deep`，复杂路线也可以先触发回答详细度 checkpoint。
- **内部合规底座**：60 个官方/准官方政策来源为交通、法律、安全、消费者权益和旅行风险提示提供基础依据。
- **面向前端体验的 CLI**：CLI 使用中文栏目和品牌化夏夏开场，方便在本地提前验证未来用户界面的对话体验。

## 环境要求

- Python `3.11+`
- `uv`
- Qdrant
- Redis
- 可通过 PydanticAI 调用的 OpenAI 兼容模型
- Tavily 或 Exa API Key
- Firecrawl API Key

可选但推荐：

- Docker 或 Docker Compose，用于启动 Qdrant 和 Redis
- Hugging Face 模型缓存，用于本地 embedding 和 reranker

## 安装

克隆项目并安装依赖：

```bash
git clone https://github.com/TianyuHanAaron/HuaXia_TourismRAG.git
cd HuaXia_TourismRAG
uv sync
```

创建本地环境变量文件：

```bash
cp .env.example .env
```

在 `.env` 中填写真实 API Key。不要提交 `.env`。

本地开发时推荐关闭模型 reranker：

```env
ENABLE_MODEL_RERANKER=false
```

这样可以显著减少本地测试延迟，并避免 MPS/GPU 内存不足。

为避免 PydanticAI 关于 `openai:` 前缀的弃用提示，推荐使用：

```env
TOURISM_AGENT_MODEL=openai-chat:gpt-5.5
```

请根据你的账号实际可用模型名称进行调整。

## 关键环境变量

完整配置见 `.env.example`。

```env
APP_NAME="HuaXia Tourism RAG"

TOURISM_AGENT_MODEL=openai-chat:gpt-5.5
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ADMIN_KEY=

SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_tavily_api_key_here
EXA_API_KEY=your_exa_api_key_here

FIRECRAWL_API_KEY=your_firecrawl_api_key_here

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=tourism_internal_docs
QDRANT_UPSERT_BATCH_SIZE=32
QDRANT_TIMEOUT_SECONDS=120

REDIS_URL=redis://localhost:6379/0
SESSION_TTL_SECONDS=86400

EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBEDDING_DIMENSIONS=1024
EMBEDDING_API_URL=
EMBEDDING_API_KEY=
EMBEDDING_BATCH_SIZE=4
RERANKER_MODEL=BAAI/bge-reranker-v2-m3
ENABLE_MODEL_RERANKER=false
MAX_MODEL_RERANK_CANDIDATES=6

MAX_SEARCH_RESULTS=8
MAX_PAGES_TO_READ=6
TOP_K_CONTEXTS=4
MIN_RERANKER_SCORE=0.05
```

## 启动本地服务

使用 Docker：

```bash
docker compose up -d qdrant redis
```

如果想用容器一次启动完整本地栈，包括 FastAPI 后端和 Streamlit 前端：

```bash
docker compose --profile app up --build
```

启动后访问：

- FastAPI 健康检查：`http://127.0.0.1:8000/tourism/health`
- Streamlit 前端：`http://127.0.0.1:8501`

如果 macOS 上无法使用 Docker，可以用 Homebrew 启动 Redis：

```bash
brew install redis
brew services start redis
redis-cli ping
```

如果 Qdrant 不使用 Docker，可以改用 Qdrant Cloud 或其他本地安装方式，并在 `.env` 中设置 `QDRANT_URL`。

## 启动 API

加载环境变量并启动 FastAPI：

```bash
set -a
source .env
set +a

uv run uvicorn huaxia_tourismrag.main:app --reload --host 127.0.0.1 --port 8000
```

健康检查：

```bash
curl http://127.0.0.1:8000/tourism/health
```

能力说明：

```bash
curl http://127.0.0.1:8000/tourism/capabilities
```

## Streamlit 前端

如果想先体验一个更接近真实用户界面的本地版本，先启动 FastAPI，再运行：

```bash
uv run streamlit run src/huaxia_tourismrag/streamlit_app.py
```

这个 Streamlit 页面是夏夏当前的用户端原型，采用极简 kiosk 风格：用户打开后只需要选择“成熟旅行方案”或“专属路线共创”，输入旅行想法即可开始。页面支持 `concise`、`standard`、`deep` 三种回答深度，能继续多轮澄清会话，并用中文栏目展示回答、亮点、提醒、结构化行程、引用来源和服务校验。它调用现有 FastAPI 端点，因此后续切换 React 前端时可以沿用同一套后端 API 契约。

## 部署

生产部署建议拆成两个服务：

1. **FastAPI/RAG 后端**：部署到 Render、Railway、Fly.io、Google Cloud Run 或其他 Python 后端平台。
2. **Streamlit 前端**：部署到 Streamlit Community Cloud。

### 后端部署

后端已经通过 `Dockerfile` 做好容器化准备。任何支持 Docker Web
Service 的平台都可以直接构建运行。服务会监听 `${PORT:-8000}`，并暴露：

```text
/tourism/health
/tourism/questions
/tourism/itineraries/diy
/tourism/sessions/{session_id}/reply
```

如果你的后端平台从源码部署，而不是直接使用 Docker，可以使用：

```bash
uv run uvicorn huaxia_tourismrag.main:app --host 0.0.0.0 --port $PORT
```

后端密钥应配置在后端平台的环境变量里，不要提交到 GitHub：

- `OPENAI_API_KEY`
- `TOURISM_AGENT_MODEL`
- `SEARCH_PROVIDER`
- `TAVILY_API_KEY` 或 `EXA_API_KEY`
- `FIRECRAWL_API_KEY`
- `QDRANT_URL`、`QDRANT_API_KEY`、`QDRANT_COLLECTION`
- `REDIS_URL`
- `EMBEDDING_PROVIDER`、`EMBEDDING_API_URL`、`EMBEDDING_API_KEY`、`EMBEDDING_DIMENSIONS`
- 可选 MCP 服务密钥，例如 `MAPBOX_ACCESS_TOKEN` 和 `FIRECRAWL_MCP_*`

为了降低生产响应延迟，建议优先使用远程 embedding endpoint，并在没有足够
CPU/GPU 内存前关闭本地模型 reranker：

```env
EMBEDDING_PROVIDER=remote
ENABLE_MODEL_RERANKER=false
MAX_SEARCH_RESULTS=4
MAX_PAGES_TO_READ=2
TOP_K_CONTEXTS=3
```

Redis 用于保存多轮澄清会话，Qdrant 用于内部知识库检索。生产环境可以使用
Qdrant Cloud 或自托管 Qdrant，并通过 `QDRANT_URL` 指向对应实例。

### 前端部署

Streamlit Community Cloud 配置：

- Repository: `TianyuHanAaron/HuaXia_TourismRAG`
- Branch: `main`
- Main file path: `src/huaxia_tourismrag/streamlit_app.py`
- Python version: `3.11`
- Dependency file: `requirements.txt`

在 Streamlit secrets 中配置前端访问的后端地址：

```toml
STREAMLIT_API_BASE_URL = "https://your-fastapi-backend.example.com"
```

如果没有设置这个 secret，前端会默认访问 `http://127.0.0.1:8000`，这只适合本地开发。

前端也可以通过 `Dockerfile.streamlit` 容器化运行。这种方式下需要把
`STREAMLIT_API_BASE_URL` 设置为已部署的 FastAPI 后端地址。

## API 使用示例

### 常规旅游问答

适合普通旅游咨询，不论问题简短还是详细。

```bash
curl -X POST http://127.0.0.1:8000/tourism/questions \
  -H "Content-Type: application/json" \
  -d '{
    "question": "我想陪爸妈去海南岛玩7天，预算三个人总共1万左右，希望不要太累，帮我安排路线、住宿区域、美食和需要提前确认的事项。"
  }'
```

也可以提供可选结构化字段：

```json
{
  "question": "第一次去北京三天两晚怎么玩？",
  "destination": "北京",
  "travelers": 2,
  "budget_level": "mid_range",
  "detail_level": "standard",
  "interests": ["故宫", "胡同", "本地美食"],
  "language": "zh-CN"
}
```

支持的 `detail_level`：

- `concise`：路线顺序、每日一句安排、关键提醒和少量引用。
- `standard`：标准可执行版，覆盖每日路线、交通逻辑、住宿区域、美食方向和主要风险。
- `deep`：深度旅行社版，加入历史背景、交通推理、节奏强度、住宿策略、备选方案、风险和引用。

### DIY 自定义路线

适合用户自定义的特殊主题路线，尤其是不常见于旅行社标准产品的路线。

```bash
curl -X POST http://127.0.0.1:8000/tourism/itineraries/diy \
  -H "Content-Type: application/json" \
  -d '{
    "question": "三国历史巡礼，从北京出发，路线必须包含涿州、安阳、许昌、南阳、咸宁、南京、成都、汉中，10到12天，可以按交通合理性调整顺序。"
  }'
```

### 多轮澄清回复

如果响应中出现 `needs_reply: true`，说明系统需要用户补充信息。使用返回的 `session_id` 继续回复：

```bash
curl -X POST http://127.0.0.1:8000/tourism/sessions/<SESSION_ID>/reply \
  -H "Content-Type: application/json" \
  -d '{
    "message": "平衡旅行型：三国主题必须覆盖，但每个城市也可以加入最值得去的文化景点和本地美食。交通优先高铁，必要时包车，10到12天都可以。"
  }'
```

## CLI 使用

查看帮助：

```bash
uv run huaxia-tourismrag --help
```

### 交互式聊天

```bash
uv run huaxia-tourismrag chat
```

交互式 CLI 会使用夏夏的品牌化开场：

```text
嗨，我是夏夏，华夏旅行社专属 AI 旅行顾问。
把你的旅行想法丢给我吧：想去哪儿、玩几天、和谁去、预算大概多少，知道多少说多少。
还没定也没关系，我会帮你把路线、交通、住宿、美食和避坑点一步步理顺。
```

CLI 输出使用中文栏目，例如 `回答`、`亮点`、`提醒`、`引用来源`。CLI 还会自动缓存最近一个待补充信息的 `session_id`。如果夏夏追问，你可以直接回复，不需要手动复制 session ID。

### 常规旅行问题

```bash
uv run huaxia-tourismrag ask "我想陪爸妈去海南岛玩7天，预算三个人总共1万左右，希望不要太累。"
```

输出原始 JSON：

```bash
uv run huaxia-tourismrag ask "第一次去北京三天两晚怎么玩？" --raw --timeout 600
```

控制回答详细度：

```bash
uv run huaxia-tourismrag ask "北京三天怎么玩？" --detail concise
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，经涿州、许昌、成都、汉中。" --detail deep
```

### DIY 路线问题

```bash
uv run huaxia-tourismrag diy "三国历史巡礼，从北京出发，经涿州、安阳、许昌、南阳、咸宁、南京、成都、汉中，10到12天。"
```

### 回复待补充会话

如果本地已缓存待补充会话：

```bash
uv run huaxia-tourismrag reply "我更想平衡旅行型，三国主题必须覆盖，也要加入本地美食。"
```

也可以显式传入 session ID：

```bash
uv run huaxia-tourismrag reply <SESSION_ID> "我更想平衡旅行型，交通优先高铁，必要时包车。"
```

### 健康检查

```bash
uv run huaxia-tourismrag health
```

## 内部资料与 Qdrant

旧的演示种子文档已删除。内部知识库现在分为三层，更适合华夏旅行社的真实咨询业务：

- `policy_transport_rules`：旅游法律法规、铁路/民航/道路交通、安全、消费者保护、医疗、保险、海关、出入境、金融和监管资料。
- `structured_destinations`：结构化景区、文保单位、目的地和主题景点，用于支撑行程中的景点和城市判断。
- `food_specialties`：结构化本地美食、土特产、老字号资料，用于让行程更像真实旅行社顾问方案。

政策语料路径：

```text
data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl
```

已整理的 60 个来源 manifest 位于：

```text
data/internal/manifests/china_tourism_policy_sources.json
```

结构化 manifest 位于：

```text
data/internal/manifests/china_scenic_area_sources.json
data/internal/manifests/china_heritage_sources.json
data/internal/manifests/china_food_specialty_sources.json
```

结构化行数据不放在 `manifests/` 中，而是单独放在：

```text
data/internal/rows/seed/scenic_theme_seed_rows.json
data/internal/rows/seed/heritage_seed_rows.json
data/internal/rows/seed/food_specialty_seed_rows.json
```

全国扩容所需的生产来源 registry 位于：

```text
data/internal/registries/china_structured_production_source_registry.json
```

它记录了 5A 景区、省级 4A/3A 景区、全国重点文物保护单位、中华老字号、农产品地理标志/地方特产等数据集的官方或高权威来源候选。

生成后的结构化语料：

```text
data/internal/corpora/china_scenic_5a4a3a.jsonl
data/internal/corpora/china_national_heritage_sites.jsonl
data/internal/corpora/china_food_specialties_brands.jsonl
```

项目包含 `InternalCorpusIndexer`，用于加载 JSONL、切分文档、生成 embedding，并写入 Qdrant。索引过程支持 `EMBEDDING_BATCH_SIZE` 和 `QDRANT_UPSERT_BATCH_SIZE`，用于降低本地 MPS/GPU 内存压力和 Qdrant Cloud 写入超时风险。

JSONL 行可以使用 `document_id` 或 `id`，并可包含 `content_type`、`published_at`、`retrieved_at`、`location`、`province`、`city`、`district`、`level`、`tags`、`official_status` 和 `authority`。

示例：

```json
{"id":"policy:railway-passenger-rules","title":"铁路旅客运输规程","source_name":"中国铁路12306","url":"https://mobile.12306.cn/otsmobile/h5/otsbussiness/info/transportationRules.html","content_type":"railway","text":"..."}
```

根据 manifest 生成 JSONL 语料：

```bash
uv run huaxia-tourismrag build-internal-corpus \
  data/internal/manifests/china_tourism_policy_sources.json \
  --output data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl
```

生成结构化景区、文保和美食语料：

```bash
uv run huaxia-tourismrag build-structured-corpus \
  data/internal/manifests/china_scenic_area_sources.json \
  --output data/internal/corpora/china_scenic_5a4a3a.jsonl

uv run huaxia-tourismrag build-structured-corpus \
  data/internal/manifests/china_heritage_sources.json \
  --output data/internal/corpora/china_national_heritage_sites.jsonl

uv run huaxia-tourismrag build-structured-corpus \
  data/internal/manifests/china_food_specialty_sources.json \
  --output data/internal/corpora/china_food_specialties_brands.jsonl
```

索引前检查任意 JSONL 语料：

```bash
uv run huaxia-tourismrag inspect-internal-corpus data/internal/corpora/china_scenic_5a4a3a.jsonl
```

该命令会用 `RawInternalDocument` 校验每一行，并输出 content type、省份和 authority 覆盖情况。

检查结构化 source manifest 及其引用的 row file 是否存在：

```bash
uv run huaxia-tourismrag inspect-structured-manifest data/internal/manifests/china_scenic_area_sources.json
```

检查全国扩容用的生产来源 registry：

```bash
uv run huaxia-tourismrag inspect-source-registry \
  data/internal/registries/china_structured_production_source_registry.json
```

根据 registry 创建空的目标 row file：

```bash
uv run huaxia-tourismrag scaffold-structured-row-files \
  data/internal/registries/china_structured_production_source_registry.json
```

该 scaffold 命令只用于创建采集工作模板。不要把空模板文件直接索引进 Qdrant；应先填入真实行数据并用检查命令验证。
JSON 目标文件会创建为空数组 (`[]`)，CSV 目标文件只创建表头。

把清洗后的 CSV/JSON 数据导入 registry 指定的目标 row file：

```bash
uv run huaxia-tourismrag import-structured-rows \
  data/internal/registries/china_structured_production_source_registry.json \
  china_5a_scenic_areas \
  path/to/cleaned_5a_rows.csv
```

然后一键重新生成三类标准结构化语料：

```bash
uv run huaxia-tourismrag build-all-structured-corpora
```

索引内部语料：

```bash
uv run huaxia-tourismrag index-internal data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl
```

按标准顺序索引所有语料层：先索引政策/规则，再索引景区、全国文保和美食特产。批量命令只会在第一份语料上应用 `--recreate`，后续语料会追加写入同一个重建后的 collection：

```bash
EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 \
uv run huaxia-tourismrag index-all-internal --recreate
```

等价的手动命令如下：

```bash
EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 \
uv run huaxia-tourismrag index-internal data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl \
  --recreate

EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 \
uv run huaxia-tourismrag index-internal data/internal/corpora/china_scenic_5a4a3a.jsonl

EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 \
uv run huaxia-tourismrag index-internal data/internal/corpora/china_national_heritage_sites.jsonl

EMBEDDING_BATCH_SIZE=1 QDRANT_UPSERT_BATCH_SIZE=8 \
uv run huaxia-tourismrag index-internal data/internal/corpora/china_food_specialties_brands.jsonl
```

指定 Qdrant collection：

```bash
uv run huaxia-tourismrag index-internal data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl \
  --collection tourism_policy_rules
```

先删除现有 collection，再重新索引：

```bash
uv run huaxia-tourismrag index-internal data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl \
  --recreate
```

生产环境中建议优先导入以下类型资料：

- 官方文旅局资料
- 旅游法、旅行社条例、合同范本和投诉处理规则
- 铁路、民航、客运、租车和网约车规则
- 海关、出入境、外汇和证件办理规则
- 医疗、保险、消费者保护和价格监管资料
- 旅游安全提示和突发事件应急规则
- 景区官网、博物馆、遗址、公园公告
- 铁路、机场、城市交通官方资料
- 旅行社内部踩线记录和供应商资料

当华夏旅行社后续拥有自己的专有业务数据时，可以继续扩展：供应商协议、酒店踩线报告、导游反馈、线路 SOP、团队游风险预案、客户复购偏好、CRM 转化记录等。这些内容会逐步形成区别于通用大模型的业务护城河。

如果请求时报错：

```text
Collection `tourism_internal_docs` doesn't exist
```

说明 Qdrant collection 尚未创建或内部资料尚未完成索引。

Qdrant store 会在 `ensure_collection()` 中创建 `tenant_id`、`source_type`、`content_type`、`source_name`、`province`、`city`、`level`、`official_status` 和 `authority` 的 keyword payload index。

推荐第一阶段规模：

- MVP：约 10,000-12,000 条 Qdrant rows，覆盖政策、景区、文保和美食。
- 更强国内覆盖：约 15,000-25,000 条 rows。

当前结构化 manifest 是小型种子文件，用于验证管线。生产扩展应批量导入官方 5A/4A 景区列表、精选 3A 景区、全国重点文物保护单位、地方特产目录和中华老字号等资料。

扩展种子数据时，把新的 JSON 或 CSV 行文件放到 `data/internal/rows/`，再在对应 source manifest 中用 `row_file` 引用。CSV 的 `tags` 支持用 `;`、`；`、`,`、`，`、`、` 或 `|` 分隔。

以下生产目标 row files 已经接入 source manifest。后续只要把真实数据填入这些文件，再重新运行 `build-structured-corpus` 即可，不需要再改 manifest：

```text
data/internal/rows/production/china_5a_scenic_rows.json
data/internal/rows/production/china_4a_3a_selected_scenic_rows.json
data/internal/rows/production/china_national_heritage_rows.json
data/internal/rows/production/china_time_honored_brand_rows.json
data/internal/rows/production/china_agricultural_gi_specialty_rows.json
```

## 引用策略

系统目标是只引用真正参与回答的证据来源，包括解析后的网页内容和内部已验证资料。

理想引用行为：

- 对开放时间、门票、预约、交通等运营事实，优先使用官方景区、博物馆、政府、铁路、机场等来源。
- OTA 和博客更适合用于路线灵感、体验反馈、住宿区域、美食发现和小众玩法。
- 不使用与当前目的地或主题无关的网页作为引用。
- 如果没有找到官方实时来源，应集中在“待确认事项”说明一次，而不是在每天行程中反复强调。

## 开发命令

代码检查：

```bash
uv run ruff check src/huaxia_tourismrag tests
```

测试：

```bash
uv run pytest -q
```

测试覆盖内容包括：

- API 路由
- CLI 行为
- research planner
- DIY itinerary planner
- 多轮澄清 checkpoint
- Redis session store
- session reply service
- Qdrant store 映射
- web search provider
- webpage reader
- citation formatter
- evidence merge 与 relevance filtering
- reranker fallback 行为

## 常见问题

### Redis 连接失败

错误示例：

```text
redis.exceptions.ConnectionError: Error 61 connecting to localhost:6379
```

启动 Redis：

```bash
brew services start redis
redis-cli ping
```

或：

```bash
docker compose up -d redis
```

### Qdrant collection 不存在

错误示例：

```text
Collection `tourism_internal_docs` doesn't exist
```

先启动 Qdrant 并索引内部资料：

```bash
docker compose up -d qdrant
```

### Reranker 太慢或内存不足

本地测试推荐：

```env
ENABLE_MODEL_RERANKER=false
```

如果开启模型 reranker，建议控制候选数量：

```env
MAX_MODEL_RERANK_CANDIDATES=6
```

如果仍然超时或内存不足，继续降低该值。

### 请求超时

CLI 可提高 timeout：

```bash
uv run huaxia-tourismrag ask "..." --timeout 600
```

也可以降低：

```env
MAX_SEARCH_RESULTS=5
MAX_PAGES_TO_READ=3
TOP_K_CONTEXTS=4
```

## 安全说明

- `.env` 已被忽略，不应提交到 Git。
- `.env.example` 只用于安全示例配置。
- `api/routes.py` 中的用户身份逻辑是本地开发占位实现，生产环境必须替换为 JWT 或 session 校验。
- 用户表达下单意图时，应先取得明确授权，再进入线索收集、CRM、邮件或官网表单流程。
- 涉及支付、预订、证件、退款等高风险操作时，不应让模型直接执行最终交易动作。

## 生产化路线

建议后续优先补齐：

- 真实用户认证和租户身份。
- 线索收集接口，用于将高意向用户转交人工顾问。
- 官网咨询表单、CRM 或企业邮箱对接。
- 官方来源权重评分，提升景区公告、交通运营商、政府来源优先级。
- 解析网页缓存和官方状态检查缓存。
- 搜索成本、解析失败率、响应延迟和引用质量监控。
- 面向用户的前端聊天界面。
- 高意向路线、热门目的地、未解决问题和人工顾问接管结果的业务分析。
- 当产品、酒店、导游、交通供应商或协议价数据可用后，加入旅行社库存和产品匹配能力。
- 如需让内部工具或外部 AI 客户端标准化调用公司库存、CRM、订单状态和产品模板，可以进一步建设公司 MCP Server。

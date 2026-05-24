"""Command-line client for testing HuaXia Tourism RAG endpoints."""

import asyncio
import json
import os
from pathlib import Path
from typing import Annotated

import httpx
from qdrant_client import AsyncQdrantClient
import typer
from rich.console import Console
from rich.json import JSON
from rich.panel import Panel

from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.indexing.internal_corpus_builder import InternalCorpusBuilder
from huaxia_tourismrag.indexing.internal_indexer import InternalCorpusIndexer
from huaxia_tourismrag.rag.embeddings import SentenceTransformerEmbedder
from huaxia_tourismrag.rag.hf_models import load_embedding_model
from huaxia_tourismrag.vector.qdrant_store import QdrantStore


DEFAULT_BASE_URL = "http://127.0.0.1:8000"
CHAT_EXIT_TERMS = {"q", "quit", "exit", "退出"}
CHAT_HELP_TERMS = {"?", "help", "帮助", "菜单"}
CHAT_NEW_TERMS = {"new", "新的", "重新开始", "新规划"}


app = typer.Typer(
    help="Test the HuaXia Tourism RAG API from the command line.",
    no_args_is_help=True,
)
console = Console()


QuestionArg = Annotated[str, typer.Argument(help="User travel question.")]
BaseUrlOpt = Annotated[
    str,
    typer.Option(
        "--base-url",
        "-u",
        help="FastAPI server base URL.",
    ),
]
RawOpt = Annotated[
    bool,
    typer.Option("--raw", help="Print raw JSON instead of a compact rich summary."),
]
TimeoutOpt = Annotated[
    float,
    typer.Option("--timeout", help="HTTP timeout in seconds."),
]


@app.command()
def ask(
    question: QuestionArg,
    base_url: BaseUrlOpt = DEFAULT_BASE_URL,
    destination: Annotated[
        str | None,
        typer.Option("--destination", "-d", help="Optional destination context."),
    ] = None,
    travelers: Annotated[
        int | None,
        typer.Option("--travelers", "-n", help="Optional number of travelers."),
    ] = None,
    budget_level: Annotated[
        str | None,
        typer.Option(
            "--budget-level",
            "-b",
            help="Optional budget level: budget, mid_range, luxury.",
        ),
    ] = None,
    interest: Annotated[
        list[str] | None,
        typer.Option("--interest", "-i", help="Repeatable interest tag."),
    ] = None,
    raw: RawOpt = False,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Ask the conventional tourism question endpoint."""

    payload = _question_payload(
        question=question,
        destination=destination,
        travelers=travelers,
        budget_level=budget_level,
        interests=interest,
    )
    response = _post(
        base_url=base_url,
        path="/tourism/questions",
        payload=payload,
        timeout=timeout,
    )
    _print_response(response, raw=raw)


@app.command()
def diy(
    question: QuestionArg,
    base_url: BaseUrlOpt = DEFAULT_BASE_URL,
    raw: RawOpt = False,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Ask the DIY thematic itinerary endpoint."""

    response = _post(
        base_url=base_url,
        path="/tourism/itineraries/diy",
        payload={"question": question},
        timeout=timeout,
    )
    _print_response(response, raw=raw)


@app.command()
def reply(
    session_or_message: Annotated[
        str,
        typer.Argument(help="Pending session ID, or message when using cached ID."),
    ],
    message: Annotated[
        str | None,
        typer.Argument(help="Reply message when a session ID is passed explicitly."),
    ] = None,
    base_url: BaseUrlOpt = DEFAULT_BASE_URL,
    raw: RawOpt = False,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Reply to a pending multi-hop tourism session."""

    if message is None:
        session_id = _load_cached_session_id()
        if not session_id:
            console.print(
                "[red]No cached session_id.[/red] "
                "Run `ask`/`diy` until it asks a follow-up, "
                "or pass `reply SESSION_ID MESSAGE`."
            )
            raise typer.Exit(1)
        reply_message = session_or_message
    else:
        session_id = session_or_message
        reply_message = message

    response = _post(
        base_url=base_url,
        path=f"/tourism/sessions/{session_id}/reply",
        payload={"message": reply_message},
        timeout=timeout,
    )
    _print_response(response, raw=raw)


@app.command()
def chat(
    base_url: BaseUrlOpt = DEFAULT_BASE_URL,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Start a lightweight interactive travel-planning chat."""

    _print_chat_intro()

    while True:
        try:
            message = typer.prompt("你").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n夏夏先退下啦。")
            return

        normalized = message.lower()
        if not message:
            _print_chat_help()
            continue
        if normalized in CHAT_EXIT_TERMS:
            console.print("夏夏先退下啦。")
            return
        if normalized in CHAT_HELP_TERMS:
            _print_chat_help()
            continue
        if normalized in CHAT_NEW_TERMS:
            _clear_cached_session_id()
            console.print("已开始新的规划。直接说新的旅行想法吧。")
            continue
        if normalized in {"2", "继续", "继续上次规划"}:
            if _load_cached_session_id():
                console.print("直接补充上次缺少的信息就行。")
            else:
                console.print("现在没有未完成的规划。直接说新的旅行想法吧。")
            continue
        if normalized in {"3", "health", "检查", "检查运行环境"}:
            _print_response(
                _get(base_url=base_url, path="/tourism/health", timeout=20.0),
                raw=False,
            )
            continue

        session_id = _load_cached_session_id()
        if session_id:
            payload = _post(
                base_url=base_url,
                path=f"/tourism/sessions/{session_id}/reply",
                payload={"message": message},
                timeout=timeout,
            )
        else:
            payload = _post(
                base_url=base_url,
                path="/tourism/itineraries/diy"
                if _is_explicit_diy_message(message)
                else "/tourism/questions",
                payload={"question": _strip_diy_prefix(message)},
                timeout=timeout,
            )

        _print_response(payload, raw=False)


@app.command()
def health(
    base_url: BaseUrlOpt = DEFAULT_BASE_URL,
    raw: RawOpt = False,
    timeout: TimeoutOpt = 20.0,
) -> None:
    """Check the API health endpoint."""

    _print_response(
        _get(base_url=base_url, path="/tourism/health", timeout=timeout),
        raw=raw,
    )


@app.command("build-internal-corpus")
def build_internal_corpus(
    manifest_path: Annotated[
        Path,
        typer.Argument(
            help="Source manifest JSON path, e.g. data/internal/sources/china_tourism_policy_sources.json.",
        ),
    ],
    output_path: Annotated[
        Path,
        typer.Option(
            "--output",
            "-o",
            help="Output JSONL corpus path.",
        ),
    ] = Path("data/internal/china_tourism_policy_transport_rules_60.jsonl"),
) -> None:
    """Download official sources and build an internal corpus JSONL file."""

    if not manifest_path.exists():
        console.print(f"[red]Source manifest not found:[/red] {manifest_path}")
        raise typer.Exit(1)

    result = InternalCorpusBuilder().build_jsonl(
        manifest_path=manifest_path,
        output_path=output_path,
    )
    console.print(
        f"[green]Built {result.written_count} documents.[/green]\n"
        f"Output: {output_path}"
    )
    if result.failed_sources:
        console.print("\n[yellow]Skipped failed sources:[/yellow]")
        for failed in result.failed_sources:
            console.print(f"- {failed.source_id}: {failed.url} ({failed.error})")


@app.command("index-internal")
def index_internal(
    path: Annotated[
        Path,
        typer.Argument(
            help="JSONL corpus path, e.g. data/internal/china_tourism_policy_transport_rules_60.jsonl.",
        ),
    ],
    collection: Annotated[
        str | None,
        typer.Option(
            "--collection",
            "-c",
            help="Qdrant collection override. Defaults to QDRANT_COLLECTION.",
        ),
    ] = None,
    recreate: Annotated[
        bool,
        typer.Option(
            "--recreate",
            help="Delete and recreate the target Qdrant collection before indexing.",
        ),
    ] = False,
) -> None:
    """Index an internal JSONL corpus into Qdrant."""

    if not path.exists():
        console.print(f"[red]Corpus file not found:[/red] {path}")
        raise typer.Exit(1)

    indexed_count = asyncio.run(_index_internal_corpus(path, collection, recreate))
    console.print(
        f"[green]Indexed {indexed_count} chunks into Qdrant.[/green]\n"
        f"Corpus: {path}"
    )


async def _index_internal_corpus(
    path: Path, collection: str | None, recreate: bool
) -> int:
    settings = get_settings()
    if not settings.qdrant_url:
        raise typer.BadParameter("QDRANT_URL is required to index internal documents.")

    embedder = SentenceTransformerEmbedder(load_embedding_model())
    qdrant = AsyncQdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
    )
    collection_name = collection or settings.internal_collection
    if recreate and await qdrant.collection_exists(collection_name):
        await qdrant.delete_collection(collection_name)

    store = QdrantStore(
        client=qdrant,
        collection=collection_name,
        vector_size=embedder.dimensions(),
        upsert_batch_size=settings.qdrant_upsert_batch_size,
    )
    indexer = InternalCorpusIndexer(embedder=embedder, store=store)
    indexer.embedding_batch_size = settings.embedding_batch_size
    return await indexer.index_jsonl(path)


def _question_payload(
    question: str,
    destination: str | None,
    travelers: int | None,
    budget_level: str | None,
    interests: list[str] | None,
) -> dict:
    payload: dict = {"question": question}

    if destination:
        payload["destination"] = destination
    if travelers is not None:
        payload["travelers"] = travelers
    if budget_level:
        payload["budget_level"] = budget_level
    if interests:
        payload["interests"] = interests

    return payload


def _post(base_url: str, path: str, payload: dict, timeout: float) -> dict:
    url = _url(base_url, path)
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        _handle_http_error(exc)
    except httpx.HTTPError as exc:
        _handle_transport_error(exc)

    return response.json()


def _get(base_url: str, path: str, timeout: float) -> dict:
    url = _url(base_url, path)
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        _handle_http_error(exc)
    except httpx.HTTPError as exc:
        _handle_transport_error(exc)

    return response.json()


def _url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}{path}"


def _print_response(payload: dict, raw: bool) -> None:
    _sync_session_cache(payload)

    if raw:
        console.print(JSON.from_data(payload, ensure_ascii=False))
        return

    answer = payload.get("answer")
    if answer:
        console.print(Panel(str(answer), title="回答", border_style="cyan"))

    if payload.get("needs_reply") and payload.get("session_id"):
        console.print(
            f"\n[bold yellow]需要补充[/bold yellow] "
            f"session_id={payload['session_id']}"
        )

    _print_list("亮点", payload.get("highlights"))
    _print_list("提醒", payload.get("warnings"))
    _print_list("引用来源", payload.get("citations"))


def _print_list(title: str, values: list | None) -> None:
    if not values:
        return

    console.print(f"\n[bold]{title}[/bold]")
    for value in values:
        console.print(f"- {value}")


def _print_chat_intro() -> None:
    console.print(
        "[bold cyan]嗨，我是夏夏，华夏旅行社专属 AI 旅行顾问。[/bold cyan]\n"
        "把你的旅行想法丢给我吧：想去哪儿、玩几天、和谁去、预算大概多少，知道多少说多少。\n"
        "还没定也没关系，我会帮你把路线、交通、住宿、美食和避坑点一步步理顺。"
    )
    if _load_cached_session_id():
        console.print("上次规划还差一步，直接补充就能继续；想重新开始，输入 new。")
    console.print("想看示例输入 help，想退出输入 quit。")


def _print_chat_help() -> None:
    console.print(
        "\n[bold]开始：[/bold]\n"
        "1. 直接说你的旅行想法\n"
        "2. 继续上次规划\n"
        "3. 检查运行环境\n\n"
        "如果是自己设计的特殊路线，直接说城市顺序和主题就行。\n"
        "例如：三国历史巡礼，从北京出发，经涿州、许昌、成都、汉中。"
    )


def _is_explicit_diy_message(message: str) -> bool:
    normalized = message.strip().lower()
    return normalized.startswith("/diy ") or normalized.startswith("diy ")


def _strip_diy_prefix(message: str) -> str:
    stripped = message.strip()
    for prefix in ("/diy ", "diy "):
        if stripped.lower().startswith(prefix):
            return stripped[len(prefix) :].strip()
    return stripped


def _sync_session_cache(payload: dict) -> None:
    session_id = payload.get("session_id")
    if not isinstance(session_id, str) or not session_id:
        return

    if payload.get("needs_reply"):
        _save_cached_session_id(session_id)
        return

    if _load_cached_session_id() == session_id:
        _clear_cached_session_id()


def _save_cached_session_id(session_id: str) -> None:
    path = _session_cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"session_id": session_id}, ensure_ascii=False),
        encoding="utf-8",
    )


def _load_cached_session_id() -> str | None:
    path = _session_cache_path()
    if not path.exists():
        return None

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    session_id = data.get("session_id")
    return session_id if isinstance(session_id, str) and session_id else None


def _clear_cached_session_id() -> None:
    try:
        _session_cache_path().unlink()
    except FileNotFoundError:
        return


def _session_cache_path() -> Path:
    cache_home = os.environ.get("XDG_CACHE_HOME")
    base_path = Path(cache_home) if cache_home else Path.home() / ".cache"
    return base_path / "huaxia-tourismrag" / "last_session.json"


def _handle_http_error(exc: httpx.HTTPStatusError) -> None:
    response = exc.response
    detail = getattr(response, "text", "")
    console.print(
        f"[red]Request failed with status {response.status_code}[/red]\n{detail}"
    )
    raise typer.Exit(1) from exc


def _handle_transport_error(exc: httpx.HTTPError) -> None:
    if isinstance(exc, httpx.TimeoutException):
        console.print(
            "[red]Request timed out.[/red]\n"
            "Try `--timeout 600`, lower `MAX_PAGES_TO_READ`, "
            "or keep `ENABLE_MODEL_RERANKER=false` for local testing."
        )
        raise typer.Exit(1) from exc

    console.print(f"[red]Request failed[/red]\n{exc}")
    raise typer.Exit(1) from exc


if __name__ == "__main__":
    app()

"""Command-line client for testing HuaXia Tourism RAG endpoints."""

import asyncio
import json
import os
from pathlib import Path
from typing import Annotated, Any

import httpx
from qdrant_client import AsyncQdrantClient
from redis.asyncio import Redis
import typer
from rich.console import Console
from rich.json import JSON
from rich.panel import Panel

from huaxia_tourismrag.core.config import get_settings
from huaxia_tourismrag.indexing.chunking import RawInternalDocument
from huaxia_tourismrag.indexing.corpus_coverage import (
    inspect_internal_corpus_coverage,
    standard_internal_corpus_paths,
)
from huaxia_tourismrag.indexing.internal_corpus_builder import InternalCorpusBuilder
from huaxia_tourismrag.indexing.internal_indexer import InternalCorpusIndexer
from huaxia_tourismrag.indexing.official_source_importers import (
    FirecrawlCuisineExtractor,
    merge_rows_by_name_province_source,
    parse_mct_intangible_food_route_html,
    parse_moa_agricultural_gi_notice_html,
    parse_state_council_heritage_tables_html,
)
from huaxia_tourismrag.indexing.source_registry import (
    ProductionSourceRegistryManager,
)
from huaxia_tourismrag.indexing.structured_knowledge_builder import (
    StructuredKnowledgeBuilder,
)
from huaxia_tourismrag.bootstrap import (
    build_diy_itinerary_service,
    build_embedder,
    build_retrieval_cache,
    build_travel_job_queue,
    build_travel_job_store,
)
from huaxia_tourismrag.vector.qdrant_store import QdrantStore
from huaxia_tourismrag.services.job_worker import TravelJobWorker


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
DetailOpt = Annotated[
    str | None,
    typer.Option(
        "--detail",
        help="Answer depth: concise, standard, or deep.",
    ),
]
TimeoutOpt = Annotated[
    float,
    typer.Option("--timeout", help="HTTP timeout in seconds."),
]

STRUCTURED_CORPUS_BUILDS = (
    (
        "china_scenic_area_sources.json",
        "china_scenic_5a4a3a.jsonl",
    ),
    (
        "china_heritage_sources.json",
        "china_national_heritage_sites.jsonl",
    ),
    (
        "china_food_specialty_sources.json",
        "china_food_specialties_brands.jsonl",
    ),
)

STANDARD_INTERNAL_CORPORA = (
    "china_tourism_policy_transport_rules_60.jsonl",
    "china_scenic_5a4a3a.jsonl",
    "china_national_heritage_sites.jsonl",
    "china_food_specialties_brands.jsonl",
)

OFFICIAL_HERITAGE_EIGHTH_BATCH_URL = (
    "https://www.forestry.gov.cn/main/4815/20191016/173000319923859.html"
)
OFFICIAL_MOA_AGRICULTURAL_GI_URL = (
    "https://www.moa.gov.cn/nybgb/2017/dsq/201802/t20180201_6136210.htm"
)
OFFICIAL_MCT_INTANGIBLE_FOOD_ROUTE_URLS = tuple(
    f"https://zhuanti.mct.gov.cn/fymstslvxlzs/xl_detail/{page_id}.html"
    for page_id in range(9668, 9708)
)


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
    detail: DetailOpt = None,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Ask the conventional tourism question endpoint."""

    payload = _question_payload(
        question=question,
        destination=destination,
        travelers=travelers,
        budget_level=budget_level,
        interests=interest,
        detail_level=detail,
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
    detail: DetailOpt = None,
    timeout: TimeoutOpt = 300.0,
) -> None:
    """Ask the DIY thematic itinerary endpoint."""

    response = _post(
        base_url=base_url,
        path="/tourism/itineraries/diy",
        payload=_question_payload(question=question, detail_level=detail),
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
            help="Source manifest JSON path, e.g. data/internal/manifests/china_tourism_policy_sources.json.",
        ),
    ],
    output_path: Annotated[
        Path,
        typer.Option(
            "--output",
            "-o",
            help="Output JSONL corpus path.",
        ),
    ] = Path("data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl"),
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


@app.command("build-structured-corpus")
def build_structured_corpus(
    manifest_path: Annotated[
        Path,
        typer.Argument(
            help="Structured source manifest JSON path, e.g. data/internal/manifests/china_scenic_area_sources.json.",
        ),
    ],
    output_path: Annotated[
        Path,
        typer.Option(
            "--output",
            "-o",
            help="Output structured JSONL corpus path.",
        ),
    ],
) -> None:
    """Build a structured scenic, heritage, food, or brand JSONL corpus."""

    if not manifest_path.exists():
        console.print(f"[red]Source manifest not found:[/red] {manifest_path}")
        raise typer.Exit(1)

    result = StructuredKnowledgeBuilder().build_jsonl(
        manifest_path=manifest_path,
        output_path=output_path,
    )
    console.print(
        f"[green]Built {result.written_count} structured documents.[/green]\n"
        f"Skipped: {result.skipped_count}\n"
        f"Output: {output_path}"
    )
    if result.skipped_rows:
        console.print("\n[yellow]Skipped invalid rows:[/yellow]")
        for skipped in result.skipped_rows:
            console.print(f"- {skipped}")


@app.command("build-all-structured-corpora")
def build_all_structured_corpora(
    manifests_dir: Annotated[
        Path,
        typer.Option(
            "--manifests-dir",
            "--sources-dir",
            help="Directory containing structured source manifests.",
        ),
    ] = Path("data/internal/manifests"),
    output_dir: Annotated[
        Path,
        typer.Option(
            "--output-dir",
            help="Directory for generated structured JSONL corpora.",
        ),
    ] = Path("data/internal/corpora"),
) -> None:
    """Build all standard structured corpora: scenic, heritage, and food."""

    builder = StructuredKnowledgeBuilder()
    total = 0
    for manifest_name, output_name in STRUCTURED_CORPUS_BUILDS:
        manifest_path = manifests_dir / manifest_name
        output_path = output_dir / output_name
        if not manifest_path.exists():
            console.print(f"[red]Source manifest not found:[/red] {manifest_path}")
            raise typer.Exit(1)

        result = builder.build_jsonl(
            manifest_path=manifest_path,
            output_path=output_path,
        )
        total += result.written_count
        console.print(
            f"[green]{output_name}:[/green] {result.written_count} rows "
            f"({result.skipped_count} skipped)"
        )

    console.print(f"[green]Built total structured documents:[/green] {total}")


@app.command("inspect-structured-manifest")
def inspect_structured_manifest(
    manifest_path: Annotated[
        Path,
        typer.Argument(
            help="Structured source manifest JSON path to inspect.",
        ),
    ],
) -> None:
    """Inspect a structured source manifest and its referenced row files."""

    if not manifest_path.exists():
        console.print(f"[red]Source manifest not found:[/red] {manifest_path}")
        raise typer.Exit(1)

    result = StructuredKnowledgeBuilder().inspect_manifest(manifest_path)
    console.print(f"[green]Sources:[/green] {result.source_count}")
    console.print(f"Inline rows: {result.inline_row_count}")
    console.print(f"Row files: {result.row_file_count}")
    console.print(f"Rows from row files: {result.row_file_row_count}")
    console.print(f"Missing row files: {len(result.missing_row_files)}")
    if result.missing_row_files:
        console.print("\n[red]Missing row file details:[/red]")
        for path in result.missing_row_files:
            console.print(f"- {path}")
        raise typer.Exit(1)


@app.command("inspect-source-registry")
def inspect_source_registry(
    registry_path: Annotated[
        Path,
        typer.Argument(
            help="Production source registry path.",
        ),
    ] = Path("data/internal/registries/china_structured_production_source_registry.json"),
) -> None:
    """Inspect the production structured-data source registry."""

    if not registry_path.exists():
        console.print(f"[red]Source registry not found:[/red] {registry_path}")
        raise typer.Exit(1)

    result = ProductionSourceRegistryManager().inspect(registry_path)
    console.print(f"[green]Datasets:[/green] {result.dataset_count}")
    console.print(f"Source candidates: {result.source_candidate_count}")
    console.print(f"Existing target row files: {len(result.existing_target_files)}")
    console.print(f"Missing target row files: {len(result.missing_target_files)}")
    _print_counter("Priorities", result.priorities)
    _print_counter("Corpus layers", result.corpus_layers)
    if result.missing_target_files:
        console.print("\n[yellow]Missing target row files:[/yellow]")
        for path in result.missing_target_files:
            console.print(f"- {path}")


@app.command("scaffold-structured-row-files")
def scaffold_structured_row_files(
    registry_path: Annotated[
        Path,
        typer.Argument(
            help="Production source registry path.",
        ),
    ] = Path("data/internal/registries/china_structured_production_source_registry.json"),
    force: Annotated[
        bool,
        typer.Option(
            "--force",
            help="Overwrite existing target row files.",
        ),
    ] = False,
) -> None:
    """Create empty structured row files declared by the production source registry."""

    if not registry_path.exists():
        console.print(f"[red]Source registry not found:[/red] {registry_path}")
        raise typer.Exit(1)

    result = ProductionSourceRegistryManager().scaffold_row_files(
        registry_path,
        force=force,
    )
    console.print(f"[green]Created files:[/green] {len(result.created_files)}")
    console.print(f"Existing files skipped: {len(result.existing_files)}")
    for path in result.created_files:
        console.print(f"- {path}")


@app.command("import-structured-rows")
def import_structured_rows(
    registry_path: Annotated[
        Path,
        typer.Argument(
            help="Production source registry path.",
        ),
    ],
    dataset_id: Annotated[
        str,
        typer.Argument(
            help="Dataset ID from the production source registry.",
        ),
    ],
    input_path: Annotated[
        Path,
        typer.Argument(
            help="Input CSV or JSON rows to import.",
        ),
    ],
) -> None:
    """Import CSV/JSON rows into the target row file declared by the registry."""

    if not registry_path.exists():
        console.print(f"[red]Source registry not found:[/red] {registry_path}")
        raise typer.Exit(1)
    if not input_path.exists():
        console.print(f"[red]Input row file not found:[/red] {input_path}")
        raise typer.Exit(1)

    result = ProductionSourceRegistryManager().import_rows(
        registry_path=registry_path,
        dataset_id=dataset_id,
        input_path=input_path,
    )
    console.print(f"[green]Imported rows:[/green] {result.imported_count}")
    console.print(f"Skipped duplicates: {result.skipped_duplicate_count}")
    console.print(f"Target row file: {result.target_row_file}")


@app.command("import-official-production-sources")
def import_official_production_sources(
    heritage_output_path: Annotated[
        Path,
        typer.Option(
            "--heritage-output",
            help="Production heritage row file to merge official parsed rows into.",
        ),
    ] = Path("data/internal/rows/production/china_national_heritage_rows.json"),
    specialty_output_path: Annotated[
        Path,
        typer.Option(
            "--specialty-output",
            help="Production agricultural-GI row file to merge official parsed rows into.",
        ),
    ] = Path("data/internal/rows/production/china_agricultural_gi_specialty_rows.json"),
    cuisine_output_path: Annotated[
        Path,
        typer.Option(
            "--cuisine-output",
            help="Production local-cuisine row file to merge official parsed rows into.",
        ),
    ] = Path("data/internal/rows/production/china_local_cuisine_rows.json"),
    timeout: Annotated[
        float,
        typer.Option(
            "--timeout",
            help="HTTP timeout in seconds for official-source downloads.",
        ),
    ] = 60.0,
    food_extractor: Annotated[
        str,
        typer.Option(
            "--food-extractor",
            help="Local-cuisine extraction mode: auto, firecrawl, or fallback.",
        ),
    ] = "auto",
) -> None:
    """Fetch official Chinese web sources and merge parsed rows into production data."""

    heritage_content, heritage_url = _fetch_official_source(
        OFFICIAL_HERITAGE_EIGHTH_BATCH_URL,
        timeout=timeout,
    )
    heritage_rows = parse_state_council_heritage_tables_html(
        heritage_content,
        source_url=heritage_url,
    )
    _merge_json_rows(heritage_output_path, heritage_rows)
    console.print(
        f"[green]Heritage official rows parsed:[/green] {len(heritage_rows)} "
        f"-> {heritage_output_path}"
    )

    specialty_content, specialty_url = _fetch_official_source(
        OFFICIAL_MOA_AGRICULTURAL_GI_URL,
        timeout=timeout,
    )
    specialty_rows = parse_moa_agricultural_gi_notice_html(
        specialty_content,
        source_url=specialty_url,
    )
    _merge_json_rows(specialty_output_path, specialty_rows)
    console.print(
        f"[green]Agricultural-GI official rows parsed:[/green] "
        f"{len(specialty_rows)} -> {specialty_output_path}"
    )

    if food_extractor not in {"auto", "firecrawl", "fallback"}:
        raise typer.BadParameter("food-extractor must be auto, firecrawl, or fallback")

    settings = get_settings()
    firecrawl_extractor = None
    if food_extractor in {"auto", "firecrawl"} and settings.firecrawl_api_key:
        firecrawl_extractor = FirecrawlCuisineExtractor(
            api_key=settings.firecrawl_api_key,
            timeout=timeout,
        )
    elif food_extractor == "firecrawl":
        raise typer.BadParameter(
            "FIRECRAWL_API_KEY is required when --food-extractor=firecrawl"
        )

    cuisine_rows: list[dict[str, Any]] = []
    cuisine_failures: list[tuple[str, str]] = []
    for cuisine_url in OFFICIAL_MCT_INTANGIBLE_FOOD_ROUTE_URLS:
        if firecrawl_extractor is not None:
            try:
                cuisine_rows.extend(firecrawl_extractor.extract_rows(cuisine_url))
                continue
            except Exception as exc:
                if food_extractor == "firecrawl":
                    cuisine_failures.append((cuisine_url, f"firecrawl: {exc}"))
                    console.print(
                        "[yellow]Firecrawl cuisine extraction failed; "
                        f"skipping {cuisine_url}: {exc}[/yellow]"
                    )
                    continue
                console.print(
                    "[yellow]Firecrawl cuisine extraction failed; "
                    f"using conservative fallback for {cuisine_url}: {exc}[/yellow]"
                )

        try:
            cuisine_content, resolved_cuisine_url = _fetch_official_source(
                cuisine_url,
                timeout=timeout,
            )
            cuisine_rows.extend(
                parse_mct_intangible_food_route_html(
                    cuisine_content,
                    source_url=resolved_cuisine_url,
                )
            )
        except Exception as exc:
            cuisine_failures.append((cuisine_url, f"fallback: {exc}"))
            console.print(
                "[yellow]MCT fallback cuisine extraction failed; "
                f"skipping {cuisine_url}: {exc}[/yellow]"
            )

    _write_json_rows(cuisine_output_path, cuisine_rows)
    console.print(
        f"[green]MCT local-cuisine official rows parsed:[/green] "
        f"{len(cuisine_rows)} -> {cuisine_output_path}"
    )
    if cuisine_failures:
        console.print("[yellow]Skipped cuisine pages:[/yellow]")
        for url, reason in cuisine_failures:
            console.print(f"- {url}: {reason}")


@app.command("index-internal")
def index_internal(
    path: Annotated[
        Path,
        typer.Argument(
            help="JSONL corpus path, e.g. data/internal/corpora/china_tourism_policy_transport_rules_60.jsonl.",
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


@app.command("index-all-internal")
def index_all_internal(
    corpus_dir: Annotated[
        Path,
        typer.Option(
            "--corpus-dir",
            help="Directory containing standard internal JSONL corpora.",
        ),
    ] = Path("data/internal/corpora"),
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
            help="Delete and recreate the target collection before indexing the first corpus.",
        ),
    ] = False,
) -> None:
    """Index policy, scenic, heritage, and food corpora into Qdrant."""

    total = 0
    for index, filename in enumerate(STANDARD_INTERNAL_CORPORA):
        path = corpus_dir / filename
        if not path.exists():
            console.print(f"[red]Corpus file not found:[/red] {path}")
            raise typer.Exit(1)

        indexed_count = asyncio.run(
            _index_internal_corpus(
                path=path,
                collection=collection,
                recreate=recreate and index == 0,
            )
        )
        total += indexed_count
        console.print(f"[green]{filename}:[/green] {indexed_count} chunks")

    console.print(f"[green]Indexed total chunks into Qdrant:[/green] {total}")


@app.command("inspect-internal-corpus")
def inspect_internal_corpus(
    path: Annotated[
        Path,
        typer.Argument(
            help="JSONL corpus path to validate and summarize.",
        ),
    ],
) -> None:
    """Validate an internal JSONL corpus and print a compact coverage report."""

    if not path.exists():
        console.print(f"[red]Corpus file not found:[/red] {path}")
        raise typer.Exit(1)

    total = 0
    invalid: list[str] = []
    content_types: dict[str, int] = {}
    provinces: dict[str, int] = {}
    authorities: dict[str, int] = {}

    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue

        try:
            document = RawInternalDocument.model_validate_json(line)
        except Exception as exc:
            invalid.append(f"line {line_number}: {exc}")
            continue

        total += 1
        _increment(content_types, document.content_type)
        if document.province:
            _increment(provinces, document.province)
        if document.authority:
            _increment(authorities, document.authority)

    console.print(f"[green]Valid documents:[/green] {total}")
    console.print(f"[yellow]Invalid rows:[/yellow] {len(invalid)}")
    _print_counter("Content types", content_types)
    _print_counter("Top provinces", provinces, limit=10)
    _print_counter("Authorities", authorities)

    if invalid:
        console.print("\n[red]Invalid row details:[/red]")
        for error in invalid[:20]:
            console.print(f"- {error}")
        raise typer.Exit(1)


@app.command("inspect-internal-coverage")
def inspect_internal_coverage(
    corpus_dir: Annotated[
        Path,
        typer.Option(
            "--corpus-dir",
            help="Directory containing standard internal JSONL corpora.",
        ),
    ] = Path("data/internal/corpora"),
    minimum_provinces: Annotated[
        int,
        typer.Option(
            "--minimum-provinces",
            help="Minimum province coverage expected for key destination layers.",
        ),
    ] = 10,
) -> None:
    """Validate internal corpus province coverage before indexing."""

    paths = standard_internal_corpus_paths(corpus_dir)
    missing = [path for path in paths if not path.exists()]
    if missing:
        console.print("[red]Missing standard corpus files:[/red]")
        for path in missing:
            console.print(f"- {path}")
        raise typer.Exit(1)

    report = inspect_internal_corpus_coverage(paths)
    console.print(f"[green]Total internal documents:[/green] {report.total_documents}")
    console.print(f"Policy/rule documents: {report.policy_rule_documents}")
    console.print(
        "Priority province coverage: "
        + "、".join(report.priority_province_coverage)
    )
    for layer, provinces in report.provinces_by_layer.items():
        console.print(f"\n[bold]{layer}[/bold] ({len(provinces)} provinces)")
        console.print("、".join(provinces))

    if not report.has_minimum_business_coverage(
        minimum_provinces=minimum_provinces,
    ):
        console.print(
            "\n[red]Coverage is below the minimum business baseline.[/red]"
        )
        raise typer.Exit(1)


@app.command("run-diy-job-worker")
def run_diy_job_worker(
    once: Annotated[
        bool,
        typer.Option(
            "--once",
            help="Process at most one queued job and exit.",
        ),
    ] = False,
    timeout: Annotated[
        int,
        typer.Option(
            "--timeout",
            help="Queue polling timeout in seconds.",
        ),
    ] = 5,
) -> None:
    """Run the external worker for queued long-running DIY itinerary jobs."""

    asyncio.run(_run_diy_job_worker(once=once, timeout_seconds=timeout))


async def _index_internal_corpus(
    path: Path, collection: str | None, recreate: bool
) -> int:
    settings = get_settings()
    if not settings.qdrant_url:
        raise typer.BadParameter("QDRANT_URL is required to index internal documents.")

    embedder = build_embedder(settings)
    qdrant = AsyncQdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        timeout=settings.qdrant_timeout_seconds,
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


async def _run_diy_job_worker(once: bool, timeout_seconds: int) -> None:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    job_queue = build_travel_job_queue(settings, redis=redis)
    if job_queue is None:
        console.print(
            "[red]JOB_EXECUTION_MODE=queue is required for the DIY job worker.[/red]"
        )
        raise typer.Exit(1)

    job_store = build_travel_job_store(settings, redis=redis)
    retrieval_cache = build_retrieval_cache(settings, redis=redis)
    worker = TravelJobWorker(
        job_store=job_store,
        job_queue=job_queue,
        diy_service_factory=lambda tenant_id: build_diy_itinerary_service(
            tenant_id,
            retrieval_cache=retrieval_cache,
            create_pending_sessions=False,
        ),
    )

    while True:
        processed = await worker.run_once(timeout_seconds=timeout_seconds)
        if processed:
            console.print("[green]Processed one DIY itinerary job.[/green]")
        elif once:
            console.print("[yellow]No queued DIY itinerary job found.[/yellow]")

        if once:
            return


def _fetch_official_source(url: str, timeout: float) -> tuple[bytes, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0 Safari/537.36"
        ),
    }
    with httpx.Client(
        timeout=timeout,
        follow_redirects=True,
        headers=headers,
    ) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.content, str(response.url)


def _merge_json_rows(path: Path, incoming_rows: list[dict[str, Any]]) -> None:
    existing_rows = _load_json_rows(path)
    merged_rows = merge_rows_by_name_province_source(existing_rows, incoming_rows)
    _write_json_rows(path, merged_rows)


def _write_json_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _load_json_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise typer.BadParameter(f"Expected a JSON array in {path}.")
    return [
        row
        for row in payload
        if isinstance(row, dict)
    ]


def _increment(counter: dict[str, int], key: str) -> None:
    counter[key] = counter.get(key, 0) + 1


def _print_counter(title: str, counter: dict[str, int], limit: int | None = None) -> None:
    if not counter:
        return

    console.print(f"\n[bold]{title}[/bold]")
    sorted_items = sorted(counter.items(), key=lambda item: (-item[1], item[0]))
    for key, count in sorted_items[:limit]:
        console.print(f"- {key}: {count}")


def _question_payload(
    question: str,
    destination: str | None = None,
    travelers: int | None = None,
    budget_level: str | None = None,
    interests: list[str] | None = None,
    detail_level: str | None = None,
) -> dict:
    payload: dict = {"question": question}

    if destination:
        payload["destination"] = destination
    if travelers is not None:
        payload["travelers"] = travelers
    if budget_level:
        payload["budget_level"] = budget_level
    if detail_level:
        payload["detail_level"] = detail_level
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
        "只想省心出发，我可以帮你整理成熟好走的旅行方案；想玩点不一样的，我们也可以一起共创一条专属路线。\n"
        "还没定也没关系，先随便聊聊。我会把路线、交通、住宿、美食、预约和避坑点一步步理顺。\n"
        "普通旅行直接说需求就好；专属路线建议用 /diy 开头，我会按你的主题和城市来设计。"
    )
    if _load_cached_session_id():
        console.print("上次规划还差一步，直接补充就能继续；想重新开始，输入 new。")
    console.print("想看示例输入 help，想退出输入 quit。")


def _print_chat_help() -> None:
    console.print(
        "\n[bold]怎么说更准：[/bold]\n"
        "普通旅行：直接说需求，例如「爸妈来北京，想轻松玩3天」。\n"
        "特殊路线：用 /diy 开头，例如「/diy 三国历史巡礼，从北京出发，经涿州、许昌、成都、汉中」。\n\n"
        "继续上次规划：直接补充信息\n"
        "检查运行环境：输入 health\n"
        "重新开始：输入 new\n"
        "退出：输入 quit"
    )


def _is_explicit_diy_message(message: str) -> bool:
    normalized = message.strip().lower()
    if normalized.startswith("/diy ") or normalized.startswith("diy "):
        return True

    diy_signals = (
        "特殊路线",
        "自定义路线",
        "自己设计",
        "必须覆盖",
        "可以根据交通合理调整顺序",
        "主题巡礼",
        "历史巡礼",
        "路线必须包含",
        "城市顺序",
    )
    return sum(signal in normalized for signal in diy_signals) >= 2


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

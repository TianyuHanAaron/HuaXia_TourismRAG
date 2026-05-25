"""Hugging Face model loading helpers."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from huaxia_tourismrag.core.config import get_settings

if TYPE_CHECKING:
    from FlagEmbedding import FlagReranker
    from sentence_transformers import SentenceTransformer


@lru_cache
def load_embedding_model() -> SentenceTransformer:
    """Load the local sentence-transformer embedding model on demand."""

    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(get_settings().embedding_model)


@lru_cache
def load_reranker_model() -> FlagReranker:
    """Load the local reranker only when model reranking is enabled."""

    from FlagEmbedding import FlagReranker

    return FlagReranker(get_settings().reranker_model, use_fp16=False)

"""Hugging Face model loading helpers."""
from functools import lru_cache
from FlagEmbedding import FlagReranker
from sentence_transformers import SentenceTransformer
from huaxia_tourismrag.core.config import get_settings

@lru_cache
def load_embedding_model() -> SentenceTransformer:
    
    return SentenceTransformer(get_settings().embedding_model)

@lru_cache
def load_reranker_model() -> FlagReranker:
    return FlagReranker(get_settings().reranker_model, use_fp16=False)
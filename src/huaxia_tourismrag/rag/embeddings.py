"""Embedding generation helpers."""

from typing import Protocol

from sentence_transformers import SentenceTransformer


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...

    def dimensions(self) -> int: ...


class SentenceTransformerEmbedder:
    def __init__(self, model: SentenceTransformer) -> None:
        self.model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
        return vectors.tolist()

    def embed_query(self, text: str) -> list[float]:
        vector = self.model.encode(text, normalize_embeddings=True, convert_to_numpy=True)
        return vector.tolist()

    def dimensions(self) -> int:
        dims = self.model.get_embedding_dimension()
        if dims is None:
            raise ValueError("Model does not specify embedding dimensions.")
        return int(dims)

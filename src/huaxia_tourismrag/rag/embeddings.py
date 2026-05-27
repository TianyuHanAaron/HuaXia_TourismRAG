"""Embedding generation helpers."""

import time
from typing import Any, Protocol

import httpx


class Embedder(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...

    def dimensions(self) -> int: ...


class SentenceTransformerEmbedder:
    def __init__(self, model: Any) -> None:
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


class RemoteHttpEmbedder:
    """HTTP embedder for hosted embedding endpoints such as Hugging Face TEI."""

    def __init__(
        self,
        api_url: str,
        api_key: str | None,
        dimensions: int,
        timeout_seconds: float = 120.0,
        max_retries: int = 1,
        retry_delay_seconds: float = 0.5,
    ) -> None:
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self._dimensions = dimensions
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self.retry_delay_seconds = max(0.0, retry_delay_seconds)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self._post_embeddings(texts)
        vectors = self._parse_vectors(response)
        if len(vectors) != len(texts):
            raise ValueError(
                f"Embedding endpoint returned {len(vectors)} vectors for {len(texts)} texts."
            )
        return vectors

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]

    def dimensions(self) -> int:
        return self._dimensions

    def _post_embeddings(self, texts: list[str]) -> object:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payloads = (
            {"input": texts},
            {"inputs": texts},
        )
        endpoints = self._endpoint_candidates()
        last_error: httpx.HTTPError | None = None
        with httpx.Client(timeout=self.timeout_seconds) as client:
            for endpoint in endpoints:
                for payload in payloads:
                    for attempt in range(self.max_retries):
                        try:
                            response = client.post(endpoint, headers=headers, json=payload)
                            if response.status_code in {400, 404, 405, 422}:
                                break
                            response.raise_for_status()
                            return response.json()
                        except httpx.HTTPError as exc:
                            last_error = exc
                            if attempt < self.max_retries - 1:
                                time.sleep(self.retry_delay_seconds)
                                continue
                            break

        if last_error:
            raise last_error
        raise ValueError("Embedding endpoint did not return a supported response.")

    def _parse_vectors(self, data: object) -> list[list[float]]:
        if isinstance(data, dict):
            if "embeddings" in data:
                return self._coerce_vector_list(data["embeddings"])
            if "data" in data and isinstance(data["data"], list):
                return self._coerce_vector_list(
                    [item["embedding"] for item in data["data"] if isinstance(item, dict)]
                )
            if "embedding" in data:
                return self._coerce_vector_list([data["embedding"]])

        return self._coerce_vector_list(data)

    def _endpoint_candidates(self) -> tuple[str, ...]:
        if self.api_url.endswith("/v1/embeddings"):
            return (self.api_url,)
        return (f"{self.api_url}/v1/embeddings", self.api_url, f"{self.api_url}/embed")

    def _coerce_vector_list(self, value: object) -> list[list[float]]:
        if not isinstance(value, list):
            raise ValueError("Embedding response must be a list or object containing vectors.")
        if not value:
            return []
        if all(isinstance(item, int | float) for item in value):
            return [[float(item) for item in value]]
        vectors: list[list[float]] = []
        for item in value:
            if not isinstance(item, list) or not all(
                isinstance(number, int | float) for number in item
            ):
                raise ValueError("Embedding response contains non-vector items.")
            vectors.append([float(number) for number in item])
        return vectors

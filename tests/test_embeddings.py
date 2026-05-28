import httpx
import pytest

from huaxia_tourismrag.rag.embeddings import QwenCloudEmbedder, RemoteHttpEmbedder


def test_remote_http_embedder_parses_openai_style_response(monkeypatch):
    requests = []

    def fake_post(self, endpoint, headers=None, json=None):
        requests.append((endpoint, headers, json))
        return httpx.Response(
            200,
            json={
                "data": [
                    {"embedding": [0.1, 0.2]},
                    {"embedding": [0.3, 0.4]},
                ]
            },
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    embedder = RemoteHttpEmbedder(
        api_url="https://embedding.example",
        api_key="hf-test",
        dimensions=2,
    )

    vectors = embedder.embed_documents(["北京", "上海"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert requests[0][0] == "https://embedding.example/v1/embeddings"
    assert requests[0][1]["Authorization"] == "Bearer hf-test"
    assert requests[0][2] == {"input": ["北京", "上海"]}


def test_remote_http_embedder_falls_back_to_embed_path(monkeypatch):
    endpoints = []

    def fake_post(self, endpoint, headers=None, json=None):
        endpoints.append(endpoint)
        if endpoint in {
            "https://embedding.example",
            "https://embedding.example/v1/embeddings",
        }:
            return httpx.Response(404, request=httpx.Request("POST", endpoint))
        return httpx.Response(
            200,
            json={"embeddings": [[1, 2]]},
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    embedder = RemoteHttpEmbedder(
        api_url="https://embedding.example",
        api_key=None,
        dimensions=2,
    )

    assert embedder.embed_query("北京") == [1.0, 2.0]
    assert "https://embedding.example/embed" in endpoints


def test_remote_http_embedder_retries_transient_server_errors(monkeypatch):
    attempts = []

    def fake_post(self, endpoint, headers=None, json=None):
        attempts.append(endpoint)
        if len(attempts) == 1:
            return httpx.Response(503, request=httpx.Request("POST", endpoint))
        return httpx.Response(
            200,
            json={"embeddings": [[1, 2]]},
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    embedder = RemoteHttpEmbedder(
        api_url="https://embedding.example",
        api_key=None,
        dimensions=2,
        max_retries=2,
        retry_delay_seconds=0,
    )

    assert embedder.embed_query("北京") == [1.0, 2.0]
    assert len(attempts) == 2


def test_qwen_cloud_embedder_posts_model_payload_and_parses_openai_response(monkeypatch):
    requests = []

    def fake_post(self, endpoint, headers=None, json=None):
        requests.append((endpoint, headers, json))
        return httpx.Response(
            200,
            json={
                "data": [
                    {"embedding": [0.1, 0.2, 0.3]},
                    {"embedding": [0.4, 0.5, 0.6]},
                ]
            },
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.Client, "post", fake_post)
    embedder = QwenCloudEmbedder(
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        api_key="dashscope-key",
        model="text-embedding-v4",
        dimensions=3,
    )

    vectors = embedder.embed_documents(["成都火锅", "重庆小面"])

    assert vectors == [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    assert requests == [
        (
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings",
            {
                "Content-Type": "application/json",
                "Authorization": "Bearer dashscope-key",
            },
            {
                "model": "text-embedding-v4",
                "input": ["成都火锅", "重庆小面"],
            },
        )
    ]


@pytest.mark.asyncio
async def test_qwen_cloud_embedder_supports_async_batched_documents(monkeypatch):
    requests = []

    async def fake_post(self, endpoint, headers=None, json=None):
        requests.append((endpoint, headers, json))
        return httpx.Response(
            200,
            json={
                "data": [
                    {"embedding": [0.1, 0.2]},
                    {"embedding": [0.3, 0.4]},
                    {"embedding": [0.5, 0.6]},
                ]
            },
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    embedder = QwenCloudEmbedder(
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        api_key="dashscope-key",
        model="text-embedding-v4",
        dimensions=2,
        timeout_seconds=9,
    )

    vectors = await embedder.async_embed_documents(["a", "b", "c"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
    assert requests[0][2] == {
        "model": "text-embedding-v4",
        "input": ["a", "b", "c"],
    }


@pytest.mark.asyncio
async def test_remote_http_embedder_supports_async_openai_style_batch(monkeypatch):
    requests = []

    async def fake_post(self, endpoint, headers=None, json=None):
        requests.append((endpoint, headers, json))
        return httpx.Response(
            200,
            json={"data": [{"embedding": [1, 2]}, {"embedding": [3, 4]}]},
            request=httpx.Request("POST", endpoint),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    embedder = RemoteHttpEmbedder(
        api_url="https://embedding.example",
        api_key=None,
        dimensions=2,
    )

    vectors = await embedder.async_embed_documents(["北京", "上海"])

    assert vectors == [[1.0, 2.0], [3.0, 4.0]]
    assert requests[0][0] == "https://embedding.example/v1/embeddings"

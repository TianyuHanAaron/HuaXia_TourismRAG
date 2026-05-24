import httpx

from huaxia_tourismrag.rag.embeddings import RemoteHttpEmbedder


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

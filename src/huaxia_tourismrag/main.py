"""ASGI entrypoint for HuaXia Tourism RAG."""

from huaxia_tourismrag.bootstrap import create_app


app = create_app()

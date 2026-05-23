from fastapi.testclient import TestClient

from huaxia_tourismrag.main import app


def test_main_app_exposes_tourism_routes_once():
    client = TestClient(app)

    assert client.get("/tourism/health").status_code == 200
    assert client.get("/tourism/capabilities").status_code == 200
    assert client.get("/tourism/tourism/health").status_code == 404

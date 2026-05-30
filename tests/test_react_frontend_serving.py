from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag import bootstrap
from huaxia_tourismrag.core.config import Settings


def test_frontend_settings_parse_origins_and_dist_path(tmp_path: Path):
    settings = Settings(
        _env_file=None,
        SERVE_REACT_FRONTEND=True,
        REACT_FRONTEND_DIST=str(tmp_path),
        FRONTEND_ORIGINS="http://localhost:5173, http://127.0.0.1:5173",
    )

    assert settings.serve_react_frontend is True
    assert settings.react_frontend_dist == str(tmp_path)
    assert settings.frontend_origin_list == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_configure_cors_allows_vite_dev_origin():
    app = FastAPI()
    settings = Settings(
        _env_file=None,
        FRONTEND_ORIGINS="http://localhost:5173",
    )

    bootstrap.configure_frontend_cors(app, settings)

    client = TestClient(app)
    response = client.options(
        "/tourism/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_configure_react_frontend_serves_spa_and_assets(tmp_path: Path):
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text("<div id=\"root\"></div>", encoding="utf-8")
    (assets / "app.js").write_text("console.log('xiaxia')", encoding="utf-8")
    app = FastAPI()
    settings = Settings(
        _env_file=None,
        SERVE_REACT_FRONTEND=True,
        REACT_FRONTEND_DIST=str(dist),
    )

    bootstrap.configure_react_frontend(app, settings)

    client = TestClient(app)
    assert client.get("/").status_code == 200
    assert '<div id="root"></div>' in client.get("/").text
    assert client.get("/custom/react/route").status_code == 200
    assert client.get("/assets/app.js").text == "console.log('xiaxia')"
    assert client.get("/tourism/health").status_code == 404


def test_configure_react_frontend_missing_build_returns_clear_fallback(tmp_path: Path):
    app = FastAPI()
    settings = Settings(
        _env_file=None,
        SERVE_REACT_FRONTEND=True,
        REACT_FRONTEND_DIST=str(tmp_path / "missing"),
    )

    bootstrap.configure_react_frontend(app, settings)

    response = TestClient(app).get("/")

    assert response.status_code == 503
    assert "React frontend build is not available" in response.text

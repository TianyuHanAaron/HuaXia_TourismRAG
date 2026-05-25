import subprocess
import sys


def test_embedding_bootstrap_imports_do_not_load_local_model_stacks():
    script = """
import sys
import huaxia_tourismrag.bootstrap
import huaxia_tourismrag.rag.embeddings
loaded = {"torch", "sentence_transformers", "FlagEmbedding"} & set(sys.modules)
if loaded:
    raise SystemExit(f"heavy modules loaded at import time: {sorted(loaded)}")
"""

    result = subprocess.run(
        [sys.executable, "-c", script],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr or result.stdout

# Local 3D Model Assets

Place the Xiaxia GLB model here:

```text
assets/models/xiaxia-avatar.glb
```

The Streamlit UI automatically switches from the static avatar image to a real
interactive 3D render when that file exists.

## Download

The current prototype avatar source is the Sketchfab model `Anime Girl
Character`:

<https://sketchfab.com/3d-models/anime-girl-character-ec164c039241435e93a77f197e999c98>

Add your Sketchfab API token to `.env`:

```bash
SKETCHFAB_API_TOKEN=your_token_here
```

Then run:

```bash
uv run python scripts/download_sketchfab_model.py
```

The script uses Sketchfab's `Token` authorization scheme and writes the GLB to
`assets/models/xiaxia-avatar.glb`. It never prints the token or temporary signed
download URL.

## License

Keep the Sketchfab attribution visible in production unless the asset is
replaced with a proprietary HuaXia-owned avatar.

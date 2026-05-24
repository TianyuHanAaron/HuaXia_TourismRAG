# HuaXia Tourism RAG Visual Assets

This folder contains externally sourced prototype assets for the Streamlit UI.
Keep attribution visible in production if these files are used in a public-facing
page.

## Structure

```text
assets/
  avatars/
    xiaxia-avatar-3d.jpg
    xiaxia-avatar-3d-source.jpeg
  models/
    xiaxia-avatar.glb
  travel/
    china-great-wall-hero.jpg
```

## Asset Inventory

| File | Intended UI role | Source | License / attribution |
| --- | --- | --- | --- |
| `avatars/xiaxia-avatar-3d.jpg` | Xiaxia assistant avatar | Sketchfab, `Anime Girl Character` | ItsKrish7, CC BY 4.0 |
| `models/xiaxia-avatar.glb` | Interactive Xiaxia 3D avatar | Sketchfab, `Anime Girl Character` | ItsKrish7, CC BY 4.0 |
| `travel/china-great-wall-hero.jpg` | Main background / hero image | Wikimedia Commons, `File:The Great Wall of China at Jinshanling.jpg` | Vincent Ndaku, CC BY-SA 3.0 |

## Notes

- The Xiaxia avatar uses a local GLB file when `models/xiaxia-avatar.glb`
  exists. The static JPG is retained as a fallback for chat bubbles and for
  environments where WebGL/model-viewer is unavailable. The model page is
  <https://sketchfab.com/3d-models/anime-girl-character-ec164c039241435e93a77f197e999c98>.
- Download the model with `uv run python scripts/download_sketchfab_model.py`
  after adding `SKETCHFAB_API_TOKEN` to `.env`.
- The Wikimedia images were downloaded through `Special:FilePath` with a width
  parameter so the local files are lighter than the originals.
- CC BY / CC BY-SA assets require attribution. CC BY-SA assets may impose
  share-alike obligations if modified.
- These assets are suitable for prototype UI usage. Before a production launch,
  either keep visible attribution, replace them with owned agency photography, or
  generate a proprietary HuaXia-branded asset set.

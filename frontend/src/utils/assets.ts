import manifest from '../assets/huaxia-manifest.json';

type AssetManifestEntry = {
  id: string;
  path: string;
  role: string;
  title?: string;
  attribution?: string;
  source_page?: string;
  license?: string;
};

type AssetManifest = {
  assets: AssetManifestEntry[];
};

const ASSET_ROOT = '/assets/huaxia';
const typedManifest = manifest as AssetManifest;

export const assetUrl = (manifestPath: string): string => {
  const parts = manifestPath.split('/');
  return `${ASSET_ROOT}/${parts.slice(1).join('/')}`;
};

export const getAssetById = (id: string): AssetManifestEntry | undefined =>
  typedManifest.assets.find((asset) => asset.id === id);

export const getHeroBackgrounds = (): AssetManifestEntry[] =>
  typedManifest.assets.filter((asset) => asset.role === 'hero_background');

export const chooseSessionBackground = (): AssetManifestEntry => {
  const backgrounds = getHeroBackgrounds();
  const stored = sessionStorage.getItem('huaxia-background-id');
  const existing = backgrounds.find((asset) => asset.id === stored);
  if (existing) {
    return existing;
  }
  const selected = backgrounds[Math.floor(Math.random() * backgrounds.length)] ?? backgrounds[0];
  sessionStorage.setItem('huaxia-background-id', selected.id);
  return selected;
};

export const assetCredits = (): AssetManifestEntry[] => typedManifest.assets;

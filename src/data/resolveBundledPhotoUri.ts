import { Image } from "react-native";

import { ASSET_MAP } from "../../scripts/assetMap";

const URI_CACHE = new Map<string, string | null>();
const ASSET_PREFIX_RE = /^assets\//i;
const REMOTE_RE = /^(https?:|file:|content:|data:)/i;

type AssetModuleMap = Record<string, any>;

export function resolveBundledPhotoUri(path?: string | null): string | null {
  if (!path) return null;
  const str = String(path);
  if (REMOTE_RE.test(str)) {
    return str;
  }
  const cached = URI_CACHE.get(str);
  if (cached !== undefined) {
    return cached;
  }
  const assets: AssetModuleMap = ASSET_MAP as AssetModuleMap;
  const key = ASSET_PREFIX_RE.test(str) ? str : `assets/${str.replace(/^\//, "")}`;
  const mod = assets[key];
  if (mod) {
    const resolved = Image.resolveAssetSource(mod);
    const uri = resolved?.uri ?? null;
    URI_CACHE.set(str, uri);
    return uri;
  }
  console.warn("Missing bundled photo asset", str);
  URI_CACHE.set(str, null);
  return null;
}

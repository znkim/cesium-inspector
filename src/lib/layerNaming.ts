import type { AppInputs, ResourceKind } from '../types/resources';

const kindLabel: Record<ResourceKind, string> = {
  terrain: 'Terrain',
  tileset: '3D Tiles',
  imagery: 'Imagery',
};

function sanitizeName(name?: string) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : '';
}

function getNameFromUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = decodeURIComponent(segments.at(-1) ?? '');

    if (!lastSegment || lastSegment === 'tileset.json') {
      return decodeURIComponent(segments.at(-2) ?? '');
    }

    return lastSegment;
  } catch {
    const cleanUrl = trimmed.split(/[?#]/)[0] ?? '';
    const segments = cleanUrl.split('/').filter(Boolean);
    return decodeURIComponent(segments.at(-1) ?? '');
  }
}

export function getDisplayLayerName(
  kind: ResourceKind,
  input: AppInputs[ResourceKind],
  activeUrl: string,
  fallbackIndex: number,
) {
  const directName = sanitizeName(input.name);
  if (directName) return directName;

  const fromUrl = getNameFromUrl(activeUrl || input.url).trim();
  if (fromUrl && fromUrl !== '{z}' && fromUrl !== '{x}' && fromUrl !== '{y}') {
    return fromUrl;
  }

  return `${kindLabel[kind]} ${fallbackIndex}`;
}

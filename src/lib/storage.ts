import type { AppInputs, BasemapId, RecentResourceEntry, ResourceInput, ResourceKind } from '../types/resources';

const STORAGE_KEY = 'cesium-inspector:inputs';
const THEME_STORAGE_KEY = 'cesium-inspector:theme';
const BASEMAP_STORAGE_KEY = 'cesium-inspector:basemap';
const RECENT_RESOURCES_STORAGE_KEY = 'cesium-inspector:recent-resources';
const MAX_RECENT_RESOURCES = 8;

export type ThemePreference = 'light' | 'dark' | 'system';
export const defaultBasemap: BasemapId = 'osm';

export const defaultInputs: AppInputs = {
  terrain: {
    url: '',
    name: '',
    description: '',
  },
  tileset: {
    url: '',
    name: '',
    description: '',
  },
  imagery: {
    url: '',
    name: '',
    description: '',
  },
};

export function loadInputs(): AppInputs {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultInputs;

  try {
    const parsed = JSON.parse(raw) as Partial<AppInputs>;
    return {
      terrain: { ...defaultInputs.terrain, ...parsed.terrain },
      tileset: { ...defaultInputs.tileset, ...parsed.tileset },
      imagery: { ...defaultInputs.imagery, ...parsed.imagery },
    };
  } catch {
    return defaultInputs;
  }
}

export function saveInputs(inputs: AppInputs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
}

export function loadThemePreference(): ThemePreference {
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function saveThemePreference(theme: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function loadBasemapPreference(): BasemapId {
  const raw = localStorage.getItem(BASEMAP_STORAGE_KEY);
  if (raw === 'osm' || raw === 'carto-light' || raw === 'carto-dark') return raw;
  return defaultBasemap;
}

export function saveBasemapPreference(basemap: BasemapId): void {
  localStorage.setItem(BASEMAP_STORAGE_KEY, basemap);
}

type RecentResourcesMap = Record<ResourceKind, RecentResourceEntry[]>;

function getDefaultRecentResources(): RecentResourcesMap {
  return {
    terrain: [],
    tileset: [],
    imagery: [],
  };
}

export function loadRecentResources(): RecentResourcesMap {
  const raw = localStorage.getItem(RECENT_RESOURCES_STORAGE_KEY);
  if (!raw) return getDefaultRecentResources();

  try {
    const parsed = JSON.parse(raw) as Partial<RecentResourcesMap>;
    return {
      terrain: Array.isArray(parsed.terrain) ? parsed.terrain : [],
      tileset: Array.isArray(parsed.tileset) ? parsed.tileset : [],
      imagery: Array.isArray(parsed.imagery) ? parsed.imagery : [],
    };
  } catch {
    return getDefaultRecentResources();
  }
}

export function addRecentResource(kind: ResourceKind, resource: ResourceInput): RecentResourcesMap {
  const trimmedUrl = resource.url.trim();
  if (!trimmedUrl) return loadRecentResources();

  const nextEntry: RecentResourceEntry = {
    url: trimmedUrl,
    name: resource.name?.trim() ?? '',
    description: resource.description?.trim() ?? '',
    savedAt: new Date().toISOString(),
  };

  const current = loadRecentResources();
  const nextItems = current[kind]
    .filter((item) => item.url !== trimmedUrl)
    .slice(0, MAX_RECENT_RESOURCES - 1);

  const nextResources: RecentResourcesMap = {
    ...current,
    [kind]: [nextEntry, ...nextItems],
  };

  localStorage.setItem(RECENT_RESOURCES_STORAGE_KEY, JSON.stringify(nextResources));
  return nextResources;
}

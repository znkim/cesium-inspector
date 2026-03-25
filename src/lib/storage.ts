import type { AppInputs } from '../types/resources';

const STORAGE_KEY = 'cesium-inspector:inputs';

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

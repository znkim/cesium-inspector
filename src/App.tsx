import { useCallback, useEffect, useMemo, useState } from 'react';
import ViewerContainer from './components/ViewerContainer';
import ResourceForm from './components/ResourceForm';
import LayerStatusPanel from './components/LayerStatusPanel';
import type { AppInputs, LoadedLayerInfo, ResourceKind } from './types/resources';
import { defaultInputs, loadInputs, saveInputs } from './lib/storage';
import { CesiumManager } from './lib/cesiumManager';
import { getDisplayLayerName } from './lib/layerNaming';

interface LoadingMap {
  terrain: boolean;
  tileset: boolean;
  imagery: boolean;
}

interface ErrorMap {
  terrain?: string;
  tileset?: string;
  imagery?: string;
}

const sampleInputs: AppInputs = {
  terrain: {
    url: 'https://assets.agi.com/stk-terrain/world',
    name: 'STK Terrain Sample',
    description: 'Cesium quantized-mesh sample terrain',
  },
  tileset: {
    url: 'https://assets.cesium.com/43978/tileset.json',
    name: 'Cesium OSM Buildings',
    description: 'Sample 3D tileset URL',
  },
  imagery: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    name: 'OpenStreetMap',
    description: 'URL Template imagery',
  },
};

export default function App() {
  const [manager, setManager] = useState<CesiumManager | null>(null);

  const handleViewerReady = useCallback((nextManager: CesiumManager | null) => {
    setManager(nextManager);
  }, []);
  const [inputs, setInputs] = useState<AppInputs>(defaultInputs);
  const [loading, setLoading] = useState<LoadingMap>({
    terrain: false,
    tileset: false,
    imagery: false,
  });
  const [errors, setErrors] = useState<ErrorMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restored = loadInputs();
    setInputs(restored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveInputs(inputs);
  }, [ready, inputs]);

  const loadedLayers = useMemo<LoadedLayerInfo[]>(() => {
    if (!manager) return [];

    const active = manager.active;
    const layers: LoadedLayerInfo[] = [];
    const fallbackIndex = { terrain: 1, tileset: 1, imagery: 1 };

    if (active.terrainUrl) {
      layers.push({
        kind: 'terrain',
        name: getDisplayLayerName('terrain', inputs.terrain, active.terrainUrl, fallbackIndex.terrain++),
        description: inputs.terrain.description,
        url: active.terrainUrl,
      });
    }
    if (active.tilesetUrl) {
      layers.push({
        kind: 'tileset',
        name: getDisplayLayerName('tileset', inputs.tileset, active.tilesetUrl, fallbackIndex.tileset++),
        description: inputs.tileset.description,
        url: active.tilesetUrl,
      });
    }
    if (active.imageryUrl) {
      layers.push({
        kind: 'imagery',
        name: getDisplayLayerName('imagery', inputs.imagery, active.imageryUrl, fallbackIndex.imagery++),
        description: inputs.imagery.description,
        url: active.imageryUrl,
      });
    }

    return layers;
  }, [inputs, manager]);

  const setInput = useCallback((kind: ResourceKind, patch: Partial<AppInputs[ResourceKind]>) => {
    setInputs((prev) => ({
      ...prev,
      [kind]: {
        ...prev[kind],
        ...patch,
      },
    }));
  }, []);

  const runAction = useCallback(
    async (kind: ResourceKind, action: () => Promise<void> | void) => {
      if (!manager) return;
      setLoading((prev) => ({ ...prev, [kind]: true }));
      setErrors((prev) => ({ ...prev, [kind]: undefined }));

      try {
        await action();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setErrors((prev) => ({ ...prev, [kind]: message }));
      } finally {
        setLoading((prev) => ({ ...prev, [kind]: false }));
      }
    },
    [manager],
  );

  const loadByKind = useCallback(
    async (kind: ResourceKind) => {
      if (!manager) return;
      const url = inputs[kind].url;

      if (kind === 'terrain') {
        await runAction(kind, () => manager.loadTerrain(url));
      }
      if (kind === 'tileset') {
        await runAction(kind, () => manager.loadTileset(url));
      }
      if (kind === 'imagery') {
        await runAction(kind, () => manager.loadImagery(url));
      }
    },
    [inputs, manager, runAction],
  );

  const removeByKind = useCallback(
    (kind: ResourceKind) => {
      if (!manager) return;
      setErrors((prev) => ({ ...prev, [kind]: undefined }));

      if (kind === 'terrain') manager.removeTerrain();
      if (kind === 'tileset') manager.removeTileset();
      if (kind === 'imagery') manager.removeImagery();

      setInputs((prev) => ({
        ...prev,
        [kind]: {
          ...prev[kind],
          url: '',
        },
      }));
    },
    [manager],
  );

  const loadAll = useCallback(async () => {
    await loadByKind('terrain');
    await loadByKind('tileset');
    await loadByKind('imagery');
  }, [loadByKind]);

  const clearAll = useCallback(() => {
    if (!manager) return;
    manager.clearAll();
    setErrors({});
    setInputs(defaultInputs);
  }, [manager]);

  return (
    <main className="app-layout">
      <aside className="panel">
        <h2>Cesium Resource Tester</h2>
        <p className="muted">URL 입력 후 개별 Load 또는 Load All로 즉시 시각화합니다.</p>

        <div className="row">
          <button onClick={loadAll}>Load All</button>
          <button onClick={clearAll} className="secondary">
            Clear All
          </button>
          <button onClick={() => setInputs(sampleInputs)} className="secondary">
            샘플 입력
          </button>
        </div>

        <ResourceForm
          kind="terrain"
          input={inputs.terrain}
          loading={loading.terrain}
          error={errors.terrain}
          onChange={(patch) => setInput('terrain', patch)}
          onLoad={() => {
            void loadByKind('terrain');
          }}
          onRemove={() => removeByKind('terrain')}
        />

        <ResourceForm
          kind="tileset"
          input={inputs.tileset}
          loading={loading.tileset}
          error={errors.tileset}
          onChange={(patch) => setInput('tileset', patch)}
          onLoad={() => {
            void loadByKind('tileset');
          }}
          onRemove={() => removeByKind('tileset')}
        />

        <ResourceForm
          kind="imagery"
          input={inputs.imagery}
          loading={loading.imagery}
          error={errors.imagery}
          onChange={(patch) => setInput('imagery', patch)}
          onLoad={() => {
            void loadByKind('imagery');
          }}
          onRemove={() => removeByKind('imagery')}
        />

      </aside>

      <section className="viewer-wrap">
        <ViewerContainer onReady={handleViewerReady} />
        <LayerStatusPanel layers={loadedLayers} />
      </section>
    </main>
  );
}

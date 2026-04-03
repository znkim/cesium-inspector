import { useCallback, useEffect, useState } from 'react';
import ViewerContainer from './components/ViewerContainer';
import ResourceForm from './components/ResourceForm';
import BasemapControl from './components/BasemapControl';
import MeasurementControl from './components/MeasurementControl';
import SlideShowControl from './components/SlideShowControl';
import ThemeControl from './components/ThemeControl';
import type {
  AppInputs,
  BasemapId,
  MeasurementState,
  MeasurementTool,
  RecentResourceEntry,
  ResourceKind,
  SlideShowState,
} from './types/resources';
import {
  addRecentResource,
  defaultBasemap,
  defaultInputs,
  loadBasemapPreference,
  loadInputs,
  loadRecentResources,
  loadThemePreference,
  saveBasemapPreference,
  saveInputs,
  saveThemePreference,
  type ThemePreference,
} from './lib/storage';
import { CesiumManager } from './lib/cesiumManager';
import { CesiumSlideShow } from './lib/cesiumSlideShow';

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

const resourceTabs: Array<{ kind: ResourceKind; label: string }> = [
  { kind: 'terrain', label: 'Terrain' },
  { kind: 'tileset', label: '3D Tiles' },
  { kind: 'imagery', label: 'Imagery' },
];

const resourceLabels: Record<ResourceKind, string> = {
  terrain: 'Terrain',
  tileset: '3D Tiles',
  imagery: 'Imagery',
};

const sidebarTabs = [
  { id: 'resources', label: 'Resources' },
  { id: 'slideshow', label: '3D Slide Show' },
] as const;

type SidebarTabId = (typeof sidebarTabs)[number]['id'];

const idleMeasurementState: MeasurementState = {
  tool: null,
  instruction: 'Choose a measurement tool.',
  pointCount: 0,
  isComplete: false,
  metrics: [],
};

const idleSlideShowState: SlideShowState = {
  slides: [],
  currentIndex: -1,
  currentSlide: null,
  isPlaying: false,
};

export default function App() {
  const [manager, setManager] = useState<CesiumManager | null>(null);
  const [slideShow, setSlideShow] = useState<CesiumSlideShow | null>(null);
  const [inputs, setInputs] = useState<AppInputs>(defaultInputs);
  const [loading, setLoading] = useState<LoadingMap>({
    terrain: false,
    tileset: false,
    imagery: false,
  });
  const [errors, setErrors] = useState<ErrorMap>({});
  const [ready, setReady] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>(defaultBasemap);
  const [measurementState, setMeasurementState] = useState<MeasurementState>(idleMeasurementState);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTabId>('resources');
  const [activeResourceTab, setActiveResourceTab] = useState<ResourceKind>('terrain');
  const [slideShowState, setSlideShowState] = useState<SlideShowState>(idleSlideShowState);
  const [recentResources, setRecentResources] = useState<Record<ResourceKind, RecentResourceEntry[]>>({
    terrain: [],
    tileset: [],
    imagery: [],
  });

  const handleViewerReady = useCallback((nextManager: CesiumManager | null) => {
    setManager(nextManager);
  }, []);

  useEffect(() => {
    const restored = loadInputs();
    setInputs(restored);
    setRecentResources(loadRecentResources());
    setThemePreference(loadThemePreference());
    setBasemap(loadBasemapPreference());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveInputs(inputs);
  }, [ready, inputs]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = (event?: MediaQueryListEvent) => {
      setSystemPrefersDark(event?.matches ?? mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveThemePreference(themePreference);
  }, [ready, themePreference]);

  useEffect(() => {
    if (!ready) return;
    saveBasemapPreference(basemap);
  }, [basemap, ready]);

  const resolvedTheme = themePreference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (!manager) return;
    manager.setBasemap(basemap);
  }, [basemap, manager]);

  useEffect(() => {
    if (!manager) {
      setMeasurementState(idleMeasurementState);
      return;
    }

    return manager.subscribeMeasurement(setMeasurementState);
  }, [manager]);

  useEffect(() => {
    if (!manager || !measurementState.tool) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      manager.stopMeasurement();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manager, measurementState.tool]);

  useEffect(() => {
    if (!manager) {
      setSlideShow(null);
      setSlideShowState(idleSlideShowState);
      return;
    }

    const nextSlideShow = new CesiumSlideShow(manager.getViewer(), {
      storageKey: 'cesium-inspector:slideshow',
    });

    setSlideShow(nextSlideShow);
    const unsubscribe = nextSlideShow.subscribe(setSlideShowState);

    return () => {
      unsubscribe();
      nextSlideShow.stopSlideShow();
    };
  }, [manager]);

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
    async (kind: ResourceKind, action: () => Promise<void> | void, recentResource?: AppInputs[ResourceKind]) => {
      if (!manager) return;
      setLoading((prev) => ({ ...prev, [kind]: true }));
      setErrors((prev) => ({ ...prev, [kind]: undefined }));

      try {
        await action();
        if (recentResource) {
          setRecentResources(addRecentResource(kind, recentResource));
        }
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
      const recentResource = inputs[kind];

      if (kind === 'terrain') {
        await runAction(kind, () => manager.loadTerrain(url), recentResource);
      }
      if (kind === 'tileset') {
        await runAction(kind, () => manager.loadTileset(url), recentResource);
      }
      if (kind === 'imagery') {
        await runAction(kind, () => manager.loadImagery(url), recentResource);
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

  const startMeasurement = useCallback(
    (tool: MeasurementTool) => {
      if (!manager) return;
      if (measurementState.tool) return;
      manager.startMeasurement(tool);
    },
    [manager, measurementState.tool],
  );

  const stopMeasurement = useCallback(() => {
    if (!manager) return;
    manager.stopMeasurement();
  }, [manager]);

  const applyRecentResource = useCallback(
    (kind: ResourceKind, entry: RecentResourceEntry) => {
      setActiveResourceTab(kind);
      setInputs((prev) => ({
        ...prev,
        [kind]: {
          url: entry.url,
          name: entry.name ?? '',
          description: entry.description ?? '',
        },
      }));

      if (!manager) return;
      void runAction(
        kind,
        () => {
          if (kind === 'terrain') return manager.loadTerrain(entry.url);
          if (kind === 'tileset') return manager.loadTileset(entry.url);
          return manager.loadImagery(entry.url);
        },
        {
          url: entry.url,
          name: entry.name ?? '',
          description: entry.description ?? '',
        },
      );
    },
    [manager, runAction],
  );

  const addSlide = useCallback(
    (name: string) => {
      if (!slideShow) return;
      slideShow.recordLocation(name);
    },
    [slideShow],
  );

  const startSlideShow = useCallback(() => {
    if (!slideShow) return;
    const startIndex = slideShowState.currentIndex >= 0 ? slideShowState.currentIndex : 0;
    void slideShow.startSlideShow({ startIndex });
  }, [slideShow, slideShowState.currentIndex]);

  const stopSlideShow = useCallback(() => {
    if (!slideShow) return;
    slideShow.stopSlideShow();
  }, [slideShow]);

  const selectSlide = useCallback(
    (index: number) => {
      if (!slideShow) return;
      if (slideShowState.isPlaying) {
        slideShow.stopSlideShow();
      }
      void slideShow.goToSlide(index);
    },
    [slideShow, slideShowState.isPlaying],
  );

  const deleteSlide = useCallback(
    (index: number) => {
      if (!slideShow) return;
      if (slideShowState.isPlaying) {
        slideShow.stopSlideShow();
      }
      slideShow.removeSlide(index);
    },
    [slideShow, slideShowState.isPlaying],
  );

  return (
    <main className="app-layout">
      <section className="viewer-wrap">
        <ViewerContainer onReady={handleViewerReady} />

        {slideShowState.currentSlide ? (
          <div className="slideshow-title-banner" aria-live="polite">
            <strong>{slideShowState.currentSlide.name}</strong>
          </div>
        ) : null}

        <aside
          className={sidebarOpen ? 'panel panel-overlay is-open' : 'panel panel-overlay'}
          aria-label="Resource controls"
        >
          <button
            type="button"
            className="panel-toggle"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-expanded={sidebarOpen}
            aria-controls="resource-panel-content"
            aria-label={sidebarOpen ? 'Collapse resource panel' : 'Expand resource panel'}
          >
            <span aria-hidden="true">{sidebarOpen ? '<' : '>'}</span>
          </button>

          <div id="resource-panel-content" className="panel-content">
            <div className="panel-header">
              <div>
                <h2>Cesium Resource Tester</h2>
                <p className="muted">
                  Switch between resource loading and 3D slide show controls from the same panel.
                </p>
              </div>
            </div>

            <div className="sidebar-segmented-control" role="tablist" aria-label="Main panel section">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  className={tab.id === activeSidebarTab ? 'sidebar-segment is-active' : 'sidebar-segment'}
                  aria-selected={tab.id === activeSidebarTab}
                  onClick={() => setActiveSidebarTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="panel-body">
              {activeSidebarTab === 'resources' ? (
                <>
                  <div className="row">
                    <button onClick={loadAll}>Load All</button>
                    <button onClick={clearAll} className="secondary">
                      Clear All
                    </button>
                  </div>

                  <div className="resource-segmented-control" role="tablist" aria-label="Resource type">
                    {resourceTabs.map((tab) => (
                      <button
                        key={tab.kind}
                        type="button"
                        role="tab"
                        className={tab.kind === activeResourceTab ? 'resource-segment is-active' : 'resource-segment'}
                        aria-selected={tab.kind === activeResourceTab}
                        onClick={() => setActiveResourceTab(tab.kind)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <ResourceForm
                    kind={activeResourceTab}
                    input={inputs[activeResourceTab]}
                    loading={loading[activeResourceTab]}
                    error={errors[activeResourceTab]}
                    onChange={(patch) => setInput(activeResourceTab, patch)}
                    onLoad={() => {
                      void loadByKind(activeResourceTab);
                    }}
                    onRemove={() => removeByKind(activeResourceTab)}
                  />

                  <section
                    className="recent-resource-panel"
                    aria-label={`${resourceLabels[activeResourceTab]} recent resources`}
                  >
                    <div className="recent-resource-header">
                      <h3>Recent {resourceLabels[activeResourceTab]}</h3>
                      <small>{recentResources[activeResourceTab].length} saved</small>
                    </div>
                    {recentResources[activeResourceTab].length === 0 ? (
                      <p className="muted recent-resource-empty">No recent resources yet.</p>
                    ) : (
                      <div className="recent-resource-list">
                        {recentResources[activeResourceTab].slice(0, 4).map((entry) => (
                          <button
                            key={`${activeResourceTab}:${entry.url}`}
                            type="button"
                            className="recent-resource-item"
                            onClick={() => applyRecentResource(activeResourceTab, entry)}
                          >
                            <strong>{entry.name?.trim() || entry.url}</strong>
                            <span>{entry.url}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <SlideShowControl
                  state={slideShowState}
                  onAdd={addSlide}
                  onStart={startSlideShow}
                  onStop={stopSlideShow}
                  onSelect={selectSlide}
                  onDelete={deleteSlide}
                />
              )}
            </div>
          </div>
        </aside>
        <MeasurementControl state={measurementState} onStart={startMeasurement} onStop={stopMeasurement} />
        <ThemeControl value={themePreference} onChange={setThemePreference} />
        <BasemapControl value={basemap} onChange={setBasemap} />
      </section>
    </main>
  );
}

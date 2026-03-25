import {
  Cesium3DTileset,
  CesiumTerrainProvider,
  EllipsoidTerrainProvider,
  ImageryLayer,
  UrlTemplateImageryProvider,
  Viewer,
  WebMapTileServiceImageryProvider,
  type ImageryProvider,
} from 'cesium';

function normalizeUrl(url: string): string {
  return url.trim();
}

function parseWmtsFromUrl(rawUrl: string): {
  baseUrl: string;
  layer: string;
  style: string;
  tileMatrixSetID: string;
  format: string;
} {
  const url = new URL(rawUrl);
  const params = url.searchParams;

  return {
    baseUrl: `${url.origin}${url.pathname}`,
    layer: params.get('layer') ?? params.get('LAYER') ?? 'default',
    style: params.get('style') ?? params.get('STYLE') ?? 'default',
    tileMatrixSetID:
      params.get('tilematrixset') ?? params.get('TILEMATRIXSET') ?? 'default028mm',
    format: params.get('format') ?? params.get('FORMAT') ?? 'image/png',
  };
}

function createImageryProvider(url: string): ImageryProvider {
  const normalized = normalizeUrl(url);
  const isWmts =
    normalized.toLowerCase().includes('service=wmts') || normalized.toLowerCase().includes('/wmts');

  if (isWmts) {
    const parsed = parseWmtsFromUrl(normalized);
    return new WebMapTileServiceImageryProvider({
      url: parsed.baseUrl,
      layer: parsed.layer,
      style: parsed.style,
      format: parsed.format,
      tileMatrixSetID: parsed.tileMatrixSetID,
    });
  }

  return new UrlTemplateImageryProvider({
    url: normalized,
  });
}

export interface ActiveResources {
  terrainUrl: string | null;
  tilesetUrl: string | null;
  imageryUrl: string | null;
}

export class CesiumManager {
  private viewer: Viewer;

  private terrainUrl: string | null = null;

  private tilesetUrl: string | null = null;

  private imageryUrl: string | null = null;

  private tileset: Cesium3DTileset | null = null;

  private imageryLayer: ImageryLayer | null = null;

  constructor(container: HTMLDivElement) {
    this.viewer = new Viewer(container, {
      animation: false,
      timeline: false,
      homeButton: false,
      baseLayerPicker: false,
      geocoder: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      infoBox: false,
      selectionIndicator: false,
      fullscreenButton: false,
      shouldAnimate: true,
    });
  }

  get active(): ActiveResources {
    return {
      terrainUrl: this.terrainUrl,
      tilesetUrl: this.tilesetUrl,
      imageryUrl: this.imageryUrl,
    };
  }

  async loadTerrain(url: string): Promise<void> {
    const normalized = normalizeUrl(url);
    if (!normalized) throw new Error('Terrain URL is empty.');
    if (this.terrainUrl === normalized) return;

    this.viewer.terrainProvider = await CesiumTerrainProvider.fromUrl(normalized);
    this.terrainUrl = normalized;
  }

  removeTerrain(): void {
    this.viewer.terrainProvider = new EllipsoidTerrainProvider();
    this.terrainUrl = null;
  }

  async loadTileset(url: string): Promise<void> {
    const normalized = normalizeUrl(url);
    if (!normalized) throw new Error('3D Tiles URL is empty.');
    if (this.tilesetUrl === normalized) return;

    if (this.tileset) {
      this.viewer.scene.primitives.remove(this.tileset);
      this.tileset = null;
    }

    const next = await Cesium3DTileset.fromUrl(normalized);
    this.viewer.scene.primitives.add(next);
    this.tileset = next;
    this.tilesetUrl = normalized;
    await this.viewer.flyTo(next);
  }

  removeTileset(): void {
    if (this.tileset) {
      this.viewer.scene.primitives.remove(this.tileset);
      this.tileset = null;
    }
    this.tilesetUrl = null;
  }

  async loadImagery(url: string): Promise<void> {
    const normalized = normalizeUrl(url);
    if (!normalized) throw new Error('Imagery URL is empty.');
    if (this.imageryUrl === normalized) return;

    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }

    const provider = createImageryProvider(normalized);
    const layer = await ImageryLayer.fromProviderAsync(provider);
    this.imageryLayer = this.viewer.imageryLayers.add(layer);
    this.imageryUrl = normalized;
  }

  removeImagery(): void {
    if (this.imageryLayer) {
      this.viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }
    this.imageryUrl = null;
  }

  clearAll(): void {
    this.removeTileset();
    this.removeImagery();
    this.removeTerrain();
  }

  destroy(): void {
    this.clearAll();
    this.viewer.destroy();
  }
}

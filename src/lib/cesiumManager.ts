import {
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileset,
  CesiumTerrainProvider,
  Color,
  EllipsoidTangentPlane,
  EllipsoidTerrainProvider,
  Entity,
  HeadingPitchRange,
  ImageryLayer,
  Math as CesiumMath,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  Viewer,
  WebMapTileServiceImageryProvider,
  type ImageryProvider,
} from 'cesium';
import type { BasemapId, MeasurementMetric, MeasurementState, MeasurementTool } from '../types/resources';

type MeasurementListener = (state: MeasurementState) => void;

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

function createBasemapProvider(basemap: BasemapId): ImageryProvider {
  if (basemap === 'carto-light') {
    return new UrlTemplateImageryProvider({
      url: 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      credit: 'OpenStreetMap contributors, CARTO',
    });
  }

  if (basemap === 'carto-dark') {
    return new UrlTemplateImageryProvider({
      url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      credit: 'OpenStreetMap contributors, CARTO',
    });
  }

  return new UrlTemplateImageryProvider({
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: 'OpenStreetMap contributors',
  });
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(2)} m`;
}

function formatAngle(radians: number): string {
  if (!Number.isFinite(radians)) return '-';
  return `${CesiumMath.toDegrees(radians).toFixed(2)}°`;
}

function formatArea(squareMeters: number): string {
  if (!Number.isFinite(squareMeters)) return '-';
  if (squareMeters >= 1_000_000) return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
  return `${squareMeters.toFixed(2)} m²`;
}

function getRequiredPoints(tool: MeasurementTool): number {
  if (tool === 'angle' || tool === 'area') return 3;
  return 2;
}

function getInstruction(tool: MeasurementTool | null, pointCount: number, isComplete: boolean): string {
  if (!tool) return 'Choose a measurement tool.';
  if (isComplete) return 'Measurement complete. Press ESC or use End to stop.';

  if (tool === 'distance') {
    return pointCount === 0 ? 'Click the first point.' : 'Click the second point.';
  }
  if (tool === 'angle') {
    if (pointCount === 0) return 'Click the first segment start point.';
    if (pointCount === 1) return 'Click the angle vertex.';
    return 'Click the second segment end point.';
  }
  if (tool === 'height') {
    return pointCount === 0 ? 'Click the base point.' : 'Click the target height point.';
  }
  if (tool === 'area') {
    if (pointCount < 3) return `Click point ${pointCount + 1} of the polygon.`;
    return 'Click more points or double-click to complete the area.';
  }
  return pointCount === 0 ? 'Click the circle center.' : 'Click the radius edge point.';
}

export interface ActiveResources {
  terrainUrl: string | null;
  tilesetUrl: string | null;
  imageryUrl: string | null;
  basemap: BasemapId | null;
}

export class CesiumManager {
  private viewer: Viewer;

  private terrainUrl: string | null = null;

  private tilesetUrl: string | null = null;

  private imageryUrl: string | null = null;

  private basemap: BasemapId | null = null;

  private tileset: Cesium3DTileset | null = null;

  private imageryLayer: ImageryLayer | null = null;

  private basemapLayer: ImageryLayer | null = null;

  private measurementTool: MeasurementTool | null = null;

  private measurementPoints: Cartesian3[] = [];

  private measurementHoverPoint: Cartesian3 | null = null;

  private measurementComplete = false;

  private measurementEntities: Entity[] = [];

  private measurementHandler: ScreenSpaceEventHandler | null = null;

  private measurementListeners = new Set<MeasurementListener>();

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
    this.viewer.scene.globe.depthTestAgainstTerrain = true;
    this.viewer.imageryLayers.removeAll(true);
    this.viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  get active(): ActiveResources {
    return {
      terrainUrl: this.terrainUrl,
      tilesetUrl: this.tilesetUrl,
      imageryUrl: this.imageryUrl,
      basemap: this.basemap,
    };
  }

  subscribeMeasurement(listener: MeasurementListener): () => void {
    this.measurementListeners.add(listener);
    listener(this.getMeasurementState());
    return () => {
      this.measurementListeners.delete(listener);
    };
  }

  getMeasurementState(): MeasurementState {
    return {
      tool: this.measurementTool,
      instruction: getInstruction(this.measurementTool, this.measurementPoints.length, this.measurementComplete),
      pointCount: this.measurementPoints.length,
      isComplete: this.measurementComplete,
      metrics: this.buildMeasurementMetrics(),
    };
  }

  startMeasurement(tool: MeasurementTool): boolean {
    if (this.measurementTool) return false;

    this.measurementTool = tool;
    this.measurementPoints = [];
    this.measurementHoverPoint = null;
    this.measurementComplete = false;
    this.createMeasurementEntities(tool);
    this.attachMeasurementEvents();
    this.notifyMeasurementListeners();
    return true;
  }

  stopMeasurement(): void {
    if (this.measurementHandler) {
      this.measurementHandler.destroy();
      this.measurementHandler = null;
    }

    for (const entity of this.measurementEntities) {
      this.viewer.entities.remove(entity);
    }

    this.measurementEntities = [];
    this.measurementTool = null;
    this.measurementPoints = [];
    this.measurementHoverPoint = null;
    this.measurementComplete = false;
    this.notifyMeasurementListeners();
  }

  setBasemap(basemap: BasemapId): void {
    if (this.basemap === basemap && this.basemapLayer) return;

    if (this.basemapLayer) {
      this.viewer.imageryLayers.remove(this.basemapLayer, true);
      this.basemapLayer = null;
    }

    const provider = createBasemapProvider(basemap);
    this.basemapLayer = this.viewer.imageryLayers.addImageryProvider(provider, 0);
    this.basemap = basemap;
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

    const range = Math.max(next.boundingSphere.radius * 2.5, 150);
    await this.viewer.camera.flyToBoundingSphere(next.boundingSphere, {
      offset: new HeadingPitchRange(0, CesiumMath.toRadians(-90), range),
    });
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
    const layer = ImageryLayer.fromProviderAsync(Promise.resolve(provider));
    this.viewer.imageryLayers.add(layer);
    this.imageryLayer = layer;
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
    this.stopMeasurement();
    this.clearAll();
    this.viewer.destroy();
  }

  private notifyMeasurementListeners(): void {
    const state = this.getMeasurementState();
    for (const listener of this.measurementListeners) {
      listener(state);
    }
  }

  private attachMeasurementEvents(): void {
    if (this.measurementHandler) {
      this.measurementHandler.destroy();
    }

    const handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      if (!this.measurementTool || this.measurementComplete) return;

      const picked = this.pickWorldPosition(event.position);
      if (!picked) return;

      const point = Cartesian3.clone(picked);
      this.measurementPoints = [...this.measurementPoints, point];
      this.measurementHoverPoint = point;
      this.addMeasurementPointEntity(point);

      if (this.measurementTool !== 'area' && this.measurementPoints.length >= getRequiredPoints(this.measurementTool)) {
        this.measurementComplete = true;
        this.measurementHoverPoint = null;
      }

      this.notifyMeasurementListeners();
    }, ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
      if (this.measurementTool !== 'area' || this.measurementComplete || this.measurementPoints.length < 3) return;

      const picked = this.pickWorldPosition(event.position);
      if (picked) {
        this.measurementHoverPoint = Cartesian3.clone(picked);
      }
      this.measurementComplete = true;
      this.measurementHoverPoint = null;
      this.notifyMeasurementListeners();
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    handler.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
      if (!this.measurementTool || this.measurementComplete || this.measurementPoints.length === 0) return;

      const picked = this.pickWorldPosition(event.endPosition);
      this.measurementHoverPoint = picked ? Cartesian3.clone(picked) : null;
      this.notifyMeasurementListeners();
    }, ScreenSpaceEventType.MOUSE_MOVE);

    this.measurementHandler = handler;
  }

  private pickWorldPosition(position: Cartesian2): Cartesian3 | null {
    const scene = this.viewer.scene;

    if (scene.pickPositionSupported) {
      const picked = scene.pickPosition(position);
      if (picked) return picked;
    }

    const ray = this.viewer.camera.getPickRay(position);
    if (!ray) return null;
    return scene.globe.pick(ray, scene) ?? null;
  }

  private addMeasurementPointEntity(position: Cartesian3): void {
    const entity = this.viewer.entities.add({
      position,
      point: {
        pixelSize: 10,
        color: Color.fromCssColorString('#f97316'),
        outlineColor: Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.measurementEntities.push(entity);
  }

  private createMeasurementEntities(tool: MeasurementTool): void {
    const lineColor = Color.fromCssColorString('#f97316');
    const fillColor = Color.fromCssColorString('#f97316').withAlpha(0.18);

    if (tool === 'distance' || tool === 'angle') {
      const polyline = this.viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => this.getPolylinePositions(), false),
          width: 3,
          material: lineColor,
          clampToGround: false,
        },
      });
      this.measurementEntities.push(polyline);
      return;
    }

    if (tool === 'height') {
      const verticalLine = this.viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => this.getHeightVerticalPositions(), false),
          width: 3,
          material: lineColor,
          clampToGround: false,
        },
      });
      const connectorLine = this.viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => this.getHeightConnectorPositions(), false),
          width: 2,
          material: Color.fromCssColorString('#fde68a'),
          clampToGround: false,
        },
      });
      this.measurementEntities.push(verticalLine, connectorLine);
      return;
    }

    if (tool === 'radius') {
      const radiusLine = this.viewer.entities.add({
        polyline: {
          positions: new CallbackProperty(() => this.getRadiusLinePositions(), false),
          width: 3,
          material: lineColor,
          clampToGround: false,
        },
      });

      const ellipse = this.viewer.entities.add({
        position: new CallbackPositionProperty(() => this.measurementPoints[0], false),
        ellipse: {
          semiMajorAxis: new CallbackProperty(() => this.getRadiusValue(), false),
          semiMinorAxis: new CallbackProperty(() => this.getRadiusValue(), false),
          material: fillColor,
          outline: true,
          outlineColor: lineColor,
          height: new CallbackProperty(() => this.getEllipseHeight(), false),
        },
      });

      this.measurementEntities.push(radiusLine, ellipse);
      return;
    }

    const polygon = this.viewer.entities.add({
      polygon: {
        hierarchy: new CallbackProperty(() => {
          const positions = this.getAreaPositions();
          return positions.length >= 3 ? new PolygonHierarchy(positions) : undefined;
        }, false),
        material: fillColor,
        outline: true,
        outlineColor: lineColor,
        perPositionHeight: true,
      },
    });

    const outline = this.viewer.entities.add({
      polyline: {
        positions: new CallbackProperty(() => this.getAreaOutlinePositions(), false),
        width: 3,
        material: lineColor,
        clampToGround: false,
      },
    });

    this.measurementEntities.push(polygon, outline);
  }

  private getPolylinePositions(): Cartesian3[] {
    if (!this.measurementTool) return [];

    if (this.measurementTool === 'distance') {
      if (this.measurementPoints.length === 0) return [];
      const target = this.getCurrentTargetPoint();
      return target ? [this.measurementPoints[0], target] : [this.measurementPoints[0]];
    }

    if (this.measurementTool === 'angle') {
      const positions = [...this.measurementPoints];
      if (!this.measurementComplete && this.measurementHoverPoint) {
        positions.push(this.measurementHoverPoint);
      }
      return positions;
    }

    return [];
  }

  private getHeightVerticalPositions(): Cartesian3[] {
    const projected = this.getProjectedHeightPoint();
    if (!projected || this.measurementPoints.length === 0) return [];
    return [this.measurementPoints[0], projected];
  }

  private getHeightConnectorPositions(): Cartesian3[] {
    const projected = this.getProjectedHeightPoint();
    const target = this.getCurrentTargetPoint();
    if (!projected || !target) return [];
    return [projected, target];
  }

  private getRadiusLinePositions(): Cartesian3[] {
    if (this.measurementPoints.length === 0) return [];
    const target = this.getCurrentTargetPoint();
    return target ? [this.measurementPoints[0], target] : [this.measurementPoints[0]];
  }

  private getRadiusValue(): number {
    if (this.measurementPoints.length === 0) return 1;
    const target = this.getCurrentTargetPoint();
    if (!target) return 1;
    return Math.max(Cartesian3.distance(this.measurementPoints[0], target), 1);
  }

  private getEllipseHeight(): number {
    if (this.measurementPoints.length === 0) return 0;
    return Cartographic.fromCartesian(this.measurementPoints[0]).height;
  }

  private getAreaPositions(): Cartesian3[] {
    const positions = [...this.measurementPoints];
    if (!this.measurementComplete && this.measurementHoverPoint) {
      positions.push(this.measurementHoverPoint);
    }
    return positions;
  }

  private getAreaOutlinePositions(): Cartesian3[] {
    const positions = this.getAreaPositions();
    if (positions.length < 2) return positions;
    return this.measurementComplete ? [...positions, positions[0]] : positions;
  }

  private getProjectedHeightPoint(): Cartesian3 | null {
    if (this.measurementPoints.length === 0) return null;
    const target = this.getCurrentTargetPoint();
    if (!target) return null;

    const base = Cartographic.fromCartesian(this.measurementPoints[0]);
    const end = Cartographic.fromCartesian(target);
    return Cartesian3.fromRadians(base.longitude, base.latitude, end.height);
  }

  private getCurrentTargetPoint(): Cartesian3 | null {
    if (!this.measurementTool) return null;

    const requiredPoints = getRequiredPoints(this.measurementTool);
    if (this.measurementPoints.length >= requiredPoints && this.measurementTool !== 'area') {
      return this.measurementPoints[requiredPoints - 1] ?? null;
    }

    if (this.measurementTool === 'area' && this.measurementPoints.length > 0 && this.measurementComplete) {
      return this.measurementPoints[this.measurementPoints.length - 1] ?? null;
    }

    return this.measurementHoverPoint;
  }

  private calculateAreaSquareMeters(positions: Cartesian3[]): number {
    if (positions.length < 3) return 0;

    const tangentPlane = EllipsoidTangentPlane.fromPoints(positions);
    const projected = tangentPlane.projectPointsOntoPlane(positions);
    if (!projected || projected.length < 3) return 0;

    let area = 0;
    for (let index = 0; index < projected.length; index += 1) {
      const current = projected[index];
      const next = projected[(index + 1) % projected.length];
      area += current.x * next.y - next.x * current.y;
    }

    return Math.abs(area) * 0.5;
  }

  private calculatePerimeter(positions: Cartesian3[]): number {
    if (positions.length < 2) return 0;

    let perimeter = 0;
    for (let index = 0; index < positions.length; index += 1) {
      const nextIndex = (index + 1) % positions.length;
      const isLastSegmentOpen = !this.measurementComplete && nextIndex === 0;
      if (isLastSegmentOpen) break;
      perimeter += Cartesian3.distance(positions[index], positions[nextIndex]);
    }
    return perimeter;
  }

  private buildMeasurementMetrics(): MeasurementMetric[] {
    if (!this.measurementTool) return [];

    if (this.measurementTool === 'distance') {
      const target = this.getCurrentTargetPoint();
      if (this.measurementPoints.length === 0 || !target) return [];

      return [
        {
          label: 'Distance',
          value: formatDistance(Cartesian3.distance(this.measurementPoints[0], target)),
        },
      ];
    }

    if (this.measurementTool === 'angle') {
      const target = this.getCurrentTargetPoint();
      if (this.measurementPoints.length < 2 || !target) return [];

      const firstVector = Cartesian3.subtract(this.measurementPoints[0], this.measurementPoints[1], new Cartesian3());
      const secondVector = Cartesian3.subtract(target, this.measurementPoints[1], new Cartesian3());
      const angle = Cartesian3.angleBetween(firstVector, secondVector);

      return [
        { label: 'Angle', value: formatAngle(angle) },
        {
          label: 'Segment 1',
          value: formatDistance(Cartesian3.distance(this.measurementPoints[0], this.measurementPoints[1])),
        },
        {
          label: 'Segment 2',
          value: formatDistance(Cartesian3.distance(this.measurementPoints[1], target)),
        },
      ];
    }

    if (this.measurementTool === 'height') {
      const target = this.getCurrentTargetPoint();
      if (this.measurementPoints.length === 0 || !target) return [];

      const base = Cartographic.fromCartesian(this.measurementPoints[0]);
      const end = Cartographic.fromCartesian(target);
      const projected = this.getProjectedHeightPoint();
      const heightDelta = Math.abs(end.height - base.height);
      const horizontal = projected ? Cartesian3.distance(projected, target) : 0;
      const straight = Cartesian3.distance(this.measurementPoints[0], target);

      return [
        { label: 'Height', value: formatDistance(heightDelta) },
        { label: 'Horizontal', value: formatDistance(horizontal) },
        { label: 'Straight', value: formatDistance(straight) },
      ];
    }

    if (this.measurementTool === 'radius') {
      const target = this.getCurrentTargetPoint();
      if (this.measurementPoints.length === 0 || !target) return [];

      const radius = Cartesian3.distance(this.measurementPoints[0], target);
      return [
        { label: 'Radius', value: formatDistance(radius) },
        { label: 'Diameter', value: formatDistance(radius * 2) },
        { label: 'Circumference', value: formatDistance(2 * Math.PI * radius) },
      ];
    }

    const positions = this.getAreaPositions();
    if (positions.length < 3) return [];

    return [
      { label: 'Area', value: formatArea(this.calculateAreaSquareMeters(positions)) },
      { label: 'Perimeter', value: formatDistance(this.calculatePerimeter(positions)) },
      { label: 'Vertices', value: String(this.measurementPoints.length) },
    ];
  }
}

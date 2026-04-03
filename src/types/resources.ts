export type ResourceKind = 'terrain' | 'tileset' | 'imagery';
export type BasemapId = 'osm' | 'carto-light' | 'carto-dark' | 'cesium-bing';
export type MeasurementTool = 'distance' | 'angle' | 'height' | 'radius' | 'area';

export interface ResourceInput {
  url: string;
  name?: string;
  description?: string;
}

export interface AppInputs {
  terrain: ResourceInput;
  tileset: ResourceInput;
  imagery: ResourceInput;
}

export interface RecentResourceEntry extends ResourceInput {
  savedAt: string;
}

export interface MeasurementMetric {
  label: string;
  value: string;
}

export interface MeasurementState {
  tool: MeasurementTool | null;
  instruction: string;
  pointCount: number;
  isComplete: boolean;
  metrics: MeasurementMetric[];
}

export interface SlideDestination {
  lon: number;
  lat: number;
  height: number;
}

export interface SlideOrientation {
  heading: number;
  pitch: number;
  roll: number;
}

export interface SlideRecord {
  id: string;
  name: string;
  destination: SlideDestination;
  orientation: SlideOrientation;
  duration: number;
  pause: number;
  createdAt: string;
}

export interface SlideShowState {
  slides: SlideRecord[];
  currentIndex: number;
  currentSlide: SlideRecord | null;
  isPlaying: boolean;
}

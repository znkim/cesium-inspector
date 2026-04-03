export type ResourceKind = 'terrain' | 'tileset' | 'imagery';
export type BasemapId = 'osm' | 'carto-light' | 'carto-dark';
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

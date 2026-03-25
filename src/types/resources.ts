export type ResourceKind = 'terrain' | 'tileset' | 'imagery';

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

export interface LoadedLayerInfo {
  kind: ResourceKind;
  name: string;
  description?: string;
  url: string;
}

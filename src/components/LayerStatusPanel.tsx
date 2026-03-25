import type { LoadedLayerInfo } from '../types/resources';

interface LayerStatusPanelProps {
  layers: LoadedLayerInfo[];
}

const typeLabel: Record<LoadedLayerInfo['kind'], string> = {
  terrain: 'Terrain',
  tileset: '3D Tiles',
  imagery: 'Imagery',
};

export default function LayerStatusPanel({ layers }: LayerStatusPanelProps) {
  return (
    <aside className="layer-overlay-panel" aria-label="현재 로드된 레이어">
      <h3>현재 로드된 레이어</h3>
      {layers.length === 0 ? (
        <p className="muted">로드된 레이어가 없습니다.</p>
      ) : (
        <ul>
          {layers.map((layer) => (
            <li key={`${layer.kind}:${layer.url}`}>
              <div className="layer-overlay-header">
                <span className="layer-kind-tag">{typeLabel[layer.kind]}</span>
                <strong>{layer.name}</strong>
              </div>
              <div className="layer-url">{layer.url}</div>
              {layer.description && <small>{layer.description}</small>}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

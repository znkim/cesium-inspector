import type { LoadedLayerInfo } from '../types/resources';

interface LayerStatusPanelProps {
  layers: LoadedLayerInfo[];
}

export default function LayerStatusPanel({ layers }: LayerStatusPanelProps) {
  return (
    <section className="status-panel">
      <h3>현재 로드된 레이어</h3>
      {layers.length === 0 ? (
        <p className="muted">로드된 레이어가 없습니다.</p>
      ) : (
        <ul>
          {layers.map((layer) => (
            <li key={`${layer.kind}:${layer.url}`}>
              <strong>{layer.name}</strong>
              <div>{layer.url}</div>
              {layer.description && <small>{layer.description}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

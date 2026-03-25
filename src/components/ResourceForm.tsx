import type { ResourceInput, ResourceKind } from '../types/resources';

interface ResourceFormProps {
  kind: ResourceKind;
  input: ResourceInput;
  loading: boolean;
  error?: string;
  onChange: (patch: Partial<ResourceInput>) => void;
  onLoad: () => void;
  onRemove: () => void;
}

const labels: Record<ResourceKind, string> = {
  terrain: 'Terrain',
  tileset: '3D Tiles',
  imagery: 'Imagery',
};

const placeholders: Record<ResourceKind, string> = {
  terrain: 'https://example.com/terrain/',
  tileset: 'https://example.com/tileset/tileset.json',
  imagery: 'https://example.com/tiles/{z}/{x}/{y}.png',
};

export default function ResourceForm({
  kind,
  input,
  loading,
  error,
  onChange,
  onLoad,
  onRemove,
}: ResourceFormProps) {
  return (
    <section className="resource-card">
      <h3>{labels[kind]}</h3>
      <input
        value={input.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder={placeholders[kind]}
      />
      <input
        value={input.name ?? ''}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Name (optional)"
      />
      <input
        value={input.description ?? ''}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (optional)"
      />
      <div className="row">
        <button onClick={onLoad} disabled={loading}>
          {loading ? 'Loading...' : 'Load'}
        </button>
        <button onClick={onRemove} className="secondary" disabled={loading}>
          Remove
        </button>
      </div>
      {kind === 'imagery' && (
        <small>
          WMTS는 URL query에 layer/style/tilematrixset/format이 있으면 자동 해석합니다.
        </small>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}

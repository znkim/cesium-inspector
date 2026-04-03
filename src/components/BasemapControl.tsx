import type { BasemapId } from '../types/resources';

interface BasemapControlProps {
  value: BasemapId;
  onChange: (value: BasemapId) => void;
}

const basemapOptions: Array<{ id: BasemapId; label: string; description: string }> = [
  {
    id: 'osm',
    label: 'OpenStreetMap',
    description: 'Standard OSM raster tiles',
  },
  {
    id: 'carto-light',
    label: 'CARTO Light',
    description: 'Voyager-style light basemap',
  },
  {
    id: 'carto-dark',
    label: 'CARTO Dark',
    description: 'DarkMatter dark basemap',
  },
];

export default function BasemapControl({ value, onChange }: BasemapControlProps) {
  const activeLabel = basemapOptions.find((option) => option.id === value)?.label;

  return (
    <aside
      className="basemap-overlay-panel"
      aria-label="Basemap selector"
      tabIndex={0}
      title="Hover or focus to expand basemap options"
    >
      <div className="basemap-overlay-header">
        <h3>Basemap</h3>
        <small>{activeLabel}</small>
      </div>
      <div className="basemap-option-list">
        {basemapOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? 'basemap-option is-active' : 'basemap-option'}
            onClick={() => onChange(option.id)}
          >
            <strong>{option.label}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

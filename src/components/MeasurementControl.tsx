import type { JSX } from 'react';
import type { MeasurementState, MeasurementTool } from '../types/resources';

interface MeasurementControlProps {
  state: MeasurementState;
  onStart: (tool: MeasurementTool) => void;
  onStop: () => void;
}

function DistanceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 16L16 8" />
    </svg>
  );
}

function AngleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 18L12 10L18 18" />
      <path d="M12 10V18" />
      <path d="M12 15a3 3 0 0 0 3 3" />
    </svg>
  );
}

function HeightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4V20" />
      <path d="M9 7L12 4L15 7" />
      <path d="M9 17L12 20L15 17" />
      <path d="M6 6H8M16 18H18" />
    </svg>
  );
}

function RadiusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 12L18 8" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

function AreaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 17L9 7L18 9L16 18Z" />
      <circle cx="6" cy="17" r="1.5" />
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="18" cy="9" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </svg>
  );
}

const toolOptions: Array<{ id: MeasurementTool; label: string; Icon: () => JSX.Element }> = [
  { id: 'distance', label: 'Distance', Icon: DistanceIcon },
  { id: 'angle', label: 'Angle', Icon: AngleIcon },
  { id: 'height', label: 'Height', Icon: HeightIcon },
  { id: 'radius', label: 'Radius', Icon: RadiusIcon },
  { id: 'area', label: 'Area', Icon: AreaIcon },
];

export default function MeasurementControl({ state, onStart, onStop }: MeasurementControlProps) {
  const hasActiveMeasurement = state.tool !== null;

  return (
    <>
      <aside className="measurement-tool-rail" aria-label="Measurement tools">
        {toolOptions.map((tool) => {
          const Icon = tool.Icon;

          return (
            <button
              key={tool.id}
              type="button"
              className={tool.id === state.tool ? 'measurement-tool-button is-active' : 'measurement-tool-button'}
              onClick={() => onStart(tool.id)}
              disabled={hasActiveMeasurement && state.tool !== tool.id}
              title={tool.label}
              aria-label={tool.label}
            >
              <Icon />
            </button>
          );
        })}
      </aside>

      {hasActiveMeasurement && (
        <aside className="measurement-status-panel" aria-label="Measurement status">
          <div className="measurement-status-header">
            <div>
              <h3>{toolOptions.find((tool) => tool.id === state.tool)?.label}</h3>
              <small>{state.isComplete ? 'Measurement locked' : 'Measuring'}</small>
            </div>
            <button type="button" className="secondary" onClick={onStop}>
              End
            </button>
          </div>
          <p className="muted measurement-instruction">{state.instruction}</p>
          {state.metrics.length > 0 && (
            <dl className="measurement-metric-list">
              {state.metrics.map((metric) => (
                <div key={metric.label} className="measurement-metric-row">
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <small className="muted">Press ESC or use End to stop this measurement.</small>
        </aside>
      )}
    </>
  );
}

import { useState } from 'react';
import type { SlideShowState } from '../types/resources';

interface SlideShowControlProps {
  state: SlideShowState;
  onAdd: (name: string) => void;
  onStart: () => void;
  onStop: () => void;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

function formatCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(5) : '-';
}

export default function SlideShowControl({
  state,
  onAdd,
  onStart,
  onStop,
  onSelect,
  onDelete,
}: SlideShowControlProps) {
  const [slideName, setSlideName] = useState('');
  const currentStatus = state.isPlaying
    ? 'Playing'
    : state.currentIndex >= 0
      ? `Selected ${state.currentIndex + 1}`
      : 'Idle';

  return (
    <section className="slideshow-panel" aria-label="3D slideshow controller">
      <div className="slideshow-panel-header">
        <div>
          <h3>3D Slide Show</h3>
          <small>{currentStatus}</small>
        </div>
        <small>{state.slides.length} slides</small>
      </div>

      <div className="slideshow-save-row">
        <input
          value={slideName}
          onChange={(event) => setSlideName(event.target.value)}
          placeholder="Optional slide name"
          aria-label="Slide name"
        />
        <button
          type="button"
          onClick={() => {
            onAdd(slideName);
            setSlideName('');
          }}
        >
          Save View
        </button>
      </div>

      <div className="row">
        {state.isPlaying ? (
          <button type="button" className="secondary" onClick={onStop}>
            Stop Show
          </button>
        ) : (
          <button type="button" onClick={onStart} disabled={state.slides.length === 0}>
            Start Show
          </button>
        )}
      </div>

      {state.slides.length === 0 ? (
        <p className="muted slideshow-empty">No slides saved yet.</p>
      ) : (
        <div className="slideshow-slide-list">
          {state.slides.map((slide, index) => {
            const isActive = index === state.currentIndex;

            return (
              <div key={slide.id} className={isActive ? 'slideshow-slide-card is-active' : 'slideshow-slide-card'}>
                <button type="button" className="slideshow-slide-main" onClick={() => onSelect(index)}>
                  <strong>{slide.name}</strong>
                  <span>
                    {formatCoordinate(slide.destination.lat)}, {formatCoordinate(slide.destination.lon)}
                  </span>
                  <span>H {slide.destination.height.toFixed(1)} m</span>
                </button>
                <button
                  type="button"
                  className="secondary slideshow-delete-button"
                  onClick={() => onDelete(index)}
                  aria-label={`Delete ${slide.name}`}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

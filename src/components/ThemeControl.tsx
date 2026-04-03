import type { ThemePreference } from '../lib/storage';

interface ThemeControlProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const themeOptions: Array<{ id: ThemePreference; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function ThemeControl({ value, onChange }: ThemeControlProps) {
  const activeLabel = themeOptions.find((option) => option.id === value)?.label;

  return (
    <aside
      className="theme-overlay-panel"
      aria-label="Theme selector"
      tabIndex={0}
      title="Hover or focus to expand theme options"
    >
      <div className="theme-overlay-header">
        <h3>Theme</h3>
        <small>{activeLabel}</small>
      </div>
      <div className="theme-option-list">
        {themeOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === value ? 'theme-option is-active' : 'theme-option'}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </aside>
  );
}

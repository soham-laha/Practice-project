'use client';
import { Sun, Moon, Contrast } from 'lucide-react';
import { useApp } from './providers';
export function ThemeSwitch() {
  const { theme, setTheme } = useApp();
  return (
    <div className="theme-switch" role="group" aria-label="Color theme">
      {(
        [
          { id: 'light', Icon: Sun, label: 'Light mode' },
          { id: 'dark', Icon: Moon, label: 'Dark mode' },
          { id: 'contrast', Icon: Contrast, label: 'High contrast mode' },
        ] as const
      ).map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}

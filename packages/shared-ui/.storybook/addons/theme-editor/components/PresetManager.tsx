import React, { useState } from 'react';
import type { ThemePreset } from '../types';
import { DEFAULT_PRESET } from '../constants';

interface PresetManagerProps {
  currentTokens: Record<string, string>;
  onLoadPreset: (preset: ThemePreset) => void;
  onSavePreset: (name: string) => void;
}

// Built-in presets
const BUILT_IN_PRESETS: ThemePreset[] = [
  DEFAULT_PRESET,
  {
    name: 'Corporate',
    version: '1.0.0',
    description: 'Professional business theme',
    light: {
      ...DEFAULT_PRESET.light,
      '--primary': 'oklch(0.45 0.15 250)',
      '--secondary': 'oklch(0.95 0.02 250)',
    },
    dark: {
      ...DEFAULT_PRESET.dark,
      '--primary': 'oklch(0.55 0.15 250)',
    },
  },
  {
    name: 'Vibrant',
    version: '1.0.0',
    description: 'Bold, colorful theme',
    light: {
      ...DEFAULT_PRESET.light,
      '--primary': 'oklch(0.65 0.25 150)',
      '--secondary': 'oklch(0.90 0.10 150)',
      '--accent': 'oklch(0.85 0.15 300)',
    },
    dark: {
      ...DEFAULT_PRESET.dark,
      '--primary': 'oklch(0.70 0.25 150)',
    },
  },
  {
    name: 'Minimal',
    version: '1.0.0',
    description: 'Clean, minimal theme',
    light: {
      ...DEFAULT_PRESET.light,
      '--primary': 'oklch(0.25 0 0)',
      '--secondary': 'oklch(0.95 0 0)',
      '--background': 'oklch(1 0 0)',
    },
    dark: {
      ...DEFAULT_PRESET.dark,
      '--primary': 'oklch(0.85 0 0)',
    },
  },
];

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentTokens,
  onLoadPreset,
  onSavePreset,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setSelectedPreset(name);

    const preset = BUILT_IN_PRESETS.find((p) => p.name === name);
    if (preset) {
      onLoadPreset(preset);
    }
  };

  const handleSave = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim());
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Preset Selector */}
        <select
          value={selectedPreset}
          onChange={handlePresetSelect}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          <option value="">Select Preset...</option>
          {BUILT_IN_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name} - {preset.description}
            </option>
          ))}
        </select>

        {/* Save Button */}
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          style={{
            padding: '6px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Save
        </button>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            style={{
              flex: 1,
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              border: '1px solid #28a745',
              borderRadius: '4px',
              background: '#28a745',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default PresetManager;

import React, { useState, useCallback, useEffect } from 'react';
import { useAddonState, useChannel } from 'storybook/manager-api';
import { DEFAULT_TOKENS, DARK_MODE_OVERRIDES, ADDON_ID, EVENT_KEY, TOKEN_GROUPS } from '../constants';
import { applyTokens, exportTokens, downloadFile, copyToClipboard } from '../tokenUtils';
import type { ExportFormat } from '../types';

// Lazy load sub-components
const ColorGroup = React.lazy(() => import('./ColorGroup'));
const SizeGroup = React.lazy(() => import('./SizeGroup'));
const TypographyGroup = React.lazy(() => import('./TypographyGroup'));
const PresetManager = React.lazy(() => import('./PresetManager'));
const ThemeToggle = React.lazy(() => import('./ThemeToggle'));

export const ThemeEditor: React.FC = () => {
  const [tokens, setTokens] = useAddonState<Record<string, string>>(
    `${ADDON_ID}/tokens`,
    DEFAULT_TOKENS
  );
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasChanges, setHasChanges] = useState(false);
  const emit = useChannel({});

  // Apply tokens when they change
  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  // Handle token update
  const handleTokenUpdate = useCallback((key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    emit(EVENT_KEY, { ...tokens, [key]: value });
  }, [tokens, setTokens, emit]);

  // Handle theme toggle
  const handleThemeToggle = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      applyTokens(DARK_MODE_OVERRIDES);
    } else {
      applyTokens(tokens);
    }
  }, [tokens]);

  // Handle reset to defaults
  const handleReset = useCallback(() => {
    setTokens(DEFAULT_TOKENS);
    setHasChanges(false);
    emit(EVENT_KEY, DEFAULT_TOKENS);
  }, [setTokens, emit]);

  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    const content = exportTokens(tokens, {
      format,
      includeFonts: true,
      includeDarkMode: true,
    });

    const filenames: Record<ExportFormat, string> = {
      json: 'theme-preset.json',
      css: 'colors.css',
      tailwind: 'tailwind-theme.js',
    };

    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      css: 'text/css',
      tailwind: 'application/javascript',
    };

    downloadFile(content, filenames[format], mimeTypes[format]);
  }, [tokens]);

  // Handle copy CSS
  const handleCopyCSS = useCallback(async () => {
    const css = exportTokens(tokens, {
      format: 'css',
      includeFonts: true,
      includeDarkMode: true,
    });
    await copyToClipboard(css);
  }, [tokens]);

  return (
    <div style={{ padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>🎨 Theme Editor</h3>
        <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
      </div>

      {/* Preset Manager */}
      <React.Suspense fallback={<div>Loading presets...</div>}>
        <PresetManager
          currentTokens={tokens}
          onLoadPreset={(preset) => {
            setTokens(preset.light);
            setHasChanges(true);
            emit(EVENT_KEY, preset.light);
          }}
          onSavePreset={(name) => {
            // Save preset logic
            console.log('Save preset:', name);
          }}
        />
      </React.Suspense>

      {/* Token Groups */}
      <div style={{ marginTop: '16px' }}>
        <React.Suspense fallback={<div>Loading...</div>}>
          {TOKEN_GROUPS.filter(g => g.id !== 'typography').map((group) => (
            <ColorGroup
              key={group.id}
              group={group}
              tokens={tokens}
              onUpdate={handleTokenUpdate}
            />
          ))}

          {/* Size tokens */}
          <SizeGroup
            tokens={tokens}
            onUpdate={handleTokenUpdate}
          />

          {/* Typography tokens */}
          <TypographyGroup
            tokens={tokens}
            onUpdate={handleTokenUpdate}
          />
        </React.Suspense>
      </div>

      {/* Actions */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Reset
        </button>
        <button
          onClick={handleCopyCSS}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Copy CSS
        </button>
        <button
          onClick={() => handleExport('json')}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Export JSON
        </button>
        <button
          onClick={() => handleExport('css')}
          style={{
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Export CSS
        </button>
      </div>

      {/* Status indicator */}
      {hasChanges && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '12px',
        }}>
          ⚠️ You have unsaved changes
        </div>
      )}
    </div>
  );
};

export default ThemeEditor;

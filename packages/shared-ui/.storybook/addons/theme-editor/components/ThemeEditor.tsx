import React, { useState, useCallback, useEffect } from 'react';
import { useAddonState, useChannel } from 'storybook/manager-api';
import { DEFAULT_TOKENS, DARK_MODE_OVERRIDES, ADDON_ID, EVENT_KEY, TOKEN_GROUPS } from '../constants';
import { applyTokens, generateCSS, downloadFile, copyToClipboard } from '../tokenUtils';
import type { ExportFormat } from '../types';
import '../styles/addon.css';

// Lazy load sub-components
const ColorGroup = React.lazy(() => import('./ColorGroup'));
const TypographyGroup = React.lazy(() => import('./TypographyGroup'));
const PresetManager = React.lazy(() => import('./PresetManager'));

export const ThemeEditor: React.FC = () => {
  const [tokens, setTokens] = useAddonState<Record<string, string>>(
    `${ADDON_ID}/tokens`,
    DEFAULT_TOKENS
  );
  // Maps a font role token (--font-heading/--font-sans/--font-mono) to the
  // stylesheet URL that loads it (Google Fonts CSS2 link, Fontsource CSS link,
  // etc). Synced into fontface.css as @import rules on save.
  const [fontSourceUrls, setFontSourceUrls] = useAddonState<Record<string, string>>(
    `${ADDON_ID}/font-source-urls`,
    {}
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const emit = useChannel({});

  // Apply tokens when they change
  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  // Load the actual current values from colors.css/global.css on mount.
  // DEFAULT_TOKENS is a static snapshot that drifts the moment either file
  // changes by any means other than a fresh accurate re-snapshot (a previous
  // Save & Sync, a hand-edit, a git pull, ...) - this replaces that snapshot
  // with what's really on disk, which is what the Storybook preview itself
  // actually renders from.
  useEffect(() => {
    let cancelled = false;

    fetch('/theme-sync')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('non-200 response'))))
      .then((data: { light?: Record<string, string> }) => {
        if (cancelled || !data.light) return;
        setTokens({ ...DEFAULT_TOKENS, ...data.light });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle token update
  const handleTokenUpdate = useCallback((key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    emit(EVENT_KEY, { ...tokens, [key]: value });
  }, [tokens, setTokens, emit]);

  // Handle font source URL update (or removal when url is empty)
  const handleFontSourceUrlUpdate = useCallback((key: string, url: string) => {
    setFontSourceUrls((prev) => {
      if (!url) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: url };
    });
  }, [setFontSourceUrls]);

  // Handle reset to defaults
  const handleReset = useCallback(() => {
    setTokens(DEFAULT_TOKENS);
    setFontSourceUrls({});
    setHasChanges(false);
    emit(EVENT_KEY, DEFAULT_TOKENS);
  }, [setTokens, setFontSourceUrls, emit]);

  // Handle export
  const handleExport = useCallback((format: ExportFormat) => {
    const content = generateCSS(tokens, DARK_MODE_OVERRIDES, true);

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
    const css = generateCSS(tokens, DARK_MODE_OVERRIDES, true);
    await copyToClipboard(css);
  }, [tokens]);

  return (
    <div className="theme-editor-panel" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div className="theme-editor-header">
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#000' }}>🎨 Theme Editor</h3>
      </div>

      {/* Preset Manager - Save functionality */}
      <React.Suspense fallback={<div>Loading...</div>}>
        <PresetManager
          currentTokens={tokens}
          fontSourceUrls={fontSourceUrls}
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

          {/* Typography tokens */}
          <TypographyGroup
            tokens={tokens}
            onUpdate={handleTokenUpdate}
            fontSourceUrls={fontSourceUrls}
            onSourceUrlUpdate={handleFontSourceUrlUpdate}
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
            color: '#000',
          }}
        >
          🔄 Reset
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
            color: '#000',
          }}
        >
          📄 Export JSON
        </button>
      </div>

      {/* Load error indicator */}
      {loadError && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: '#f8d7da',
          border: '1px solid #dc3545',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#721c24',
        }}>
          ✗ Couldn't load current values from colors.css/global.css - showing built-in defaults, which may not match what's actually on disk. Check the Storybook dev server is running.
        </div>
      )}

      {/* Status indicator */}
      {hasChanges && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#000',
        }}>
          ⚠️ You have unsaved changes
        </div>
      )}
    </div>
  );
};

export default ThemeEditor;

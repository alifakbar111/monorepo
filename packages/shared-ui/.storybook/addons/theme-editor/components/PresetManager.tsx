import React, { useState, useCallback } from 'react';
import { DARK_MODE_OVERRIDES } from '../constants';

interface PresetManagerProps {
  currentTokens: Record<string, string>;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ currentTokens }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  /**
   * Save theme changes to JSON file for sync script
   */
  const handleSaveToSource = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Prepare theme data with light and dark mode
      const themeData = {
        light: currentTokens,
        dark: DARK_MODE_OVERRIDES,
        lastUpdated: new Date().toISOString(),
      };

      // Save to the storybook directory for the sync script to pick up
      const response = await fetch('/theme-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData),
      });

      if (response.ok) {
        setSaveMessage('✓ Theme saved! CSS files will update automatically.');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        // Fallback: download as JSON for manual sync
        downloadThemeJSON(themeData);
        setSaveMessage('✓ Downloaded theme.json - Run: pnpm sync-theme');
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error) {
      // Fallback: download as JSON
      const themeData = {
        light: currentTokens,
        dark: DARK_MODE_OVERRIDES,
        lastUpdated: new Date().toISOString(),
      };
      downloadThemeJSON(themeData);
      setSaveMessage('✓ Downloaded theme.json - Run: pnpm sync-theme');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [currentTokens]);

  /**
   * Download theme as JSON file
   */
  const downloadThemeJSON = (themeData: Record<string, unknown>) => {
    const content = JSON.stringify(themeData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'theme-changes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Copy CSS to clipboard
   */
  const handleCopyCSS = useCallback(async () => {
    const { generateCSS } = await import('../tokenUtils');
    const css = generateCSS(currentTokens, DARK_MODE_OVERRIDES, true);

    try {
      await navigator.clipboard.writeText(css);
      setSaveMessage('✓ CSS copied to clipboard');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('✗ Failed to copy to clipboard');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  }, [currentTokens]);

  return (
    <div style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
      {/* Auto-sync toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#000' }}>
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Auto-sync to source files
        </label>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Save to Source Button */}
        <button
          onClick={handleSaveToSource}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            border: '1px solid #28a745',
            borderRadius: '4px',
            background: isSaving ? '#ccc' : '#28a745',
            color: '#fff',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {isSaving ? '⏳ Saving...' : '💾 Save & Sync'}
        </button>

        {/* Copy CSS Button */}
        <button
          onClick={handleCopyCSS}
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
          📋 Copy CSS
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: saveMessage.startsWith('✓') ? '#d4edda' : '#f8d7da',
          border: `1px solid ${saveMessage.startsWith('✓') ? '#28a745' : '#dc3545'}`,
          borderRadius: '4px',
          fontSize: '12px',
          color: saveMessage.startsWith('✓') ? '#155724' : '#721c24',
        }}>
          {saveMessage}
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
        <strong>Auto mode:</strong> Click "Save & Sync" to update{' '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          src/styles/colors.css
        </code>
        {' '}automatically.
        <br />
        <strong>Manual mode:</strong> Run{' '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          pnpm sync-theme
        </code>
        {' '}to sync downloaded JSON.
      </div>
    </div>
  );
};

export default PresetManager;

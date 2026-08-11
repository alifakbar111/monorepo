import React, { useState, useCallback } from 'react';
import { DARK_MODE_OVERRIDES } from '../constants';

interface PresetManagerProps {
  currentTokens: Record<string, string>;
  fontSourceUrls: Record<string, string>;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ currentTokens, fontSourceUrls }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  /**
   * Save theme changes via the /theme-sync dev-server endpoint
   */
  const handleSaveToSource = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Prepare theme data with light and dark mode
      const themeData = {
        light: currentTokens,
        dark: DARK_MODE_OVERRIDES,
        fontSourceUrls,
        lastUpdated: new Date().toISOString(),
      };

      const response = await fetch('/theme-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(themeData),
      });

      if (response.ok) {
        setSaveMessage('✓ Theme saved! CSS files will update automatically.');
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        // Fallback: download as JSON backup since the endpoint rejected the request
        downloadThemeJSON(themeData);
        setSaveMessage('✗ Save failed - downloaded theme-changes.json as a backup. Check the Storybook dev server is running and retry.');
        setTimeout(() => setSaveMessage(''), 6000);
      }
    } catch (error) {
      // Fallback: download as JSON backup since the request itself couldn't reach the server
      const themeData = {
        light: currentTokens,
        dark: DARK_MODE_OVERRIDES,
        fontSourceUrls,
        lastUpdated: new Date().toISOString(),
      };
      downloadThemeJSON(themeData);
      setSaveMessage('✗ Save failed - downloaded theme-changes.json as a backup. Check the Storybook dev server is running and retry.');
      setTimeout(() => setSaveMessage(''), 6000);
    } finally {
      setIsSaving(false);
    }
  }, [currentTokens, fontSourceUrls]);

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
        Click "Save & Sync" to update{' '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          colors.css
        </code>
        {', '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          global.css
        </code>
        {' '}and{' '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          fontface.css
        </code>
        {' '}automatically. Requires the Storybook dev server to be running.
      </div>
    </div>
  );
};

export default PresetManager;

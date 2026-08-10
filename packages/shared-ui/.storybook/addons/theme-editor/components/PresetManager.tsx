import React, { useState } from 'react';
import { generateCSS, downloadFile } from '../tokenUtils';
import { DARK_MODE_OVERRIDES } from '../constants';

interface PresetManagerProps {
  currentTokens: Record<string, string>;
}

export const PresetManager: React.FC<PresetManagerProps> = ({ currentTokens }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveToSource = () => {
    setIsSaving(true);
    
    try {
      // Generate the CSS content for colors.css
      const cssContent = generateCSS(currentTokens, DARK_MODE_OVERRIDES, true);
      
      // Download as colors.css
      downloadFile(cssContent, 'colors.css', 'text/css');
      
      setSaveMessage('✓ Downloaded colors.css - Replace file at: packages/shared-ui/src/styles/colors.css');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      setSaveMessage('✗ Error generating CSS');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCSS = async () => {
    const cssContent = generateCSS(currentTokens, DARK_MODE_OVERRIDES, true);
    
    try {
      await navigator.clipboard.writeText(cssContent);
      setSaveMessage('✓ CSS copied to clipboard - Paste into colors.css');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      setSaveMessage('✗ Failed to copy to clipboard');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Save to Source Button */}
        <button
          onClick={handleSaveToSource}
          disabled={isSaving}
          style={{
            padding: '6px 12px',
            border: '1px solid #28a745',
            borderRadius: '4px',
            background: isSaving ? '#ccc' : '#28a745',
            color: '#fff',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save to Source'}
        </button>

        {/* Copy CSS Button */}
        <button
          onClick={handleCopyCSS}
          style={{
            padding: '6px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
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
        <strong>After saving:</strong> Replace the file at{' '}
        <code style={{ background: '#e9ecef', padding: '2px 4px', borderRadius: '2px' }}>
          packages/shared-ui/src/styles/colors.css
        </code>
      </div>
    </div>
  );
};

export default PresetManager;

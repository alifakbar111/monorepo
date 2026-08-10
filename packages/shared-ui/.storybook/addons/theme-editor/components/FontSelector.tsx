import React, { useState, useEffect } from 'react';

interface FontSelectorProps {
  label: string;
  tokenKey: string;
  value: string;
  onChange: (value: string) => void;
}

// Popular Google Fonts
const POPULAR_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Raleway',
  'PT Sans',
];

export const FontSelector: React.FC<FontSelectorProps> = ({
  label,
  tokenKey,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [customFont, setCustomFont] = useState('');

  // Parse font stack from CSS value
  const parseFontStack = (fontStack: string): string[] => {
    return fontStack
      .split(',')
      .map((f) => f.trim().replace(/"/g, ''))
      .filter((f) => f && !f.includes('ui-') && !f.includes('system-'));
  };

  const fonts = parseFontStack(value);

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleFontAdd = (font: string) => {
    if (font && !fonts.includes(font)) {
      const newFonts = [font, ...fonts];
      onChange(newFonts.map((f) => `"${f}"`).join(', '));
    }
  };

  const handleFontRemove = (font: string) => {
    const newFonts = fonts.filter((f) => f !== font);
    if (newFonts.length > 0) {
      onChange(newFonts.map((f) => `"${f}"`).join(', '));
    }
  };

  const handleCustomFontAdd = () => {
    if (customFont) {
      handleFontAdd(customFont);
      setCustomFont('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div style={{ marginBottom: '8px' }}>
      {/* Label */}
      <label style={{ display: 'block', fontSize: '12px', color: '#333', marginBottom: '4px' }}>
        {label}
      </label>

      {/* Current fonts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {fonts.map((font) => (
          <span
            key={font}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: '#e0e0e0',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#000000',
            }}
          >
            {font}
            <button
              onClick={() => handleFontRemove(font)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
                color: '#666',
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Quick add popular fonts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
        {POPULAR_FONTS.filter((f) => !fonts.includes(f))
          .slice(0, 5)
          .map((font) => (
            <button
              key={font}
              onClick={() => handleFontAdd(font)}
              style={{
                padding: '2px 6px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              + {font}
            </button>
          ))}
      </div>

      {/* Custom font input */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          type="text"
          value={customFont}
          onChange={(e) => setCustomFont(e.target.value)}
          placeholder="Add custom font..."
          style={{
            flex: 1,
            padding: '4px 6px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleCustomFontAdd()}
        />
        <button
          onClick={handleCustomFontAdd}
          style={{
            padding: '4px 8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#f5f5f5',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          Add
        </button>
      </div>

      {/* Raw CSS value */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        style={{
          width: '100%',
          marginTop: '4px',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
};

export default FontSelector;

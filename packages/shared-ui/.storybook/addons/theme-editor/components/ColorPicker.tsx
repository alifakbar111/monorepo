import React, { useState, useRef, useEffect } from 'react';

interface ColorPickerProps {
  label: string;
  tokenKey: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  tokenKey,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Only update if it's a valid color
    if (newValue && (newValue.startsWith('#') || newValue.startsWith('oklch') || newValue.startsWith('rgb'))) {
      onChange(newValue);
    }
  };

  const handleSwatchClick = () => {
    setIsOpen(!isOpen);
  };

  // Get display color (simplified - just use the value)
  const displayColor = value;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      {/* Label */}
      <span style={{ flex: 1, fontSize: '12px', color: '#333' }}>{label}</span>

      {/* Color Swatch */}
      <button
        onClick={handleSwatchClick}
        style={{
          width: '24px',
          height: '24px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: displayColor,
          cursor: 'pointer',
          padding: 0,
        }}
        title={value}
      />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={() => setInputValue(value)}
        style={{
          width: '140px',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      />

      {/* Simple Color Picker Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            padding: '12px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {/* Native color input */}
          <input
            type="color"
            value={value.startsWith('#') ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', height: '100px', cursor: 'pointer' }}
          />

          {/* Quick presets */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
              '#ffff00', '#ff00ff', '#00ffff', '#f5f5f5', '#333333',
            ].map((color) => (
              <button
                key={color}
                onClick={() => onChange(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  border: '1px solid #ccc',
                  borderRadius: '2px',
                  background: color,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Direct input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '4px 6px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Update on every change for live preview
    if (newValue) {
      onChange(newValue);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value if input is invalid
    setInputValue(value);
  };

  const handleSwatchClick = () => {
    setIsOpen(!isOpen);
  };

  // Get display color - handle oklch by showing a fallback
  const getDisplayColor = () => {
    if (value.startsWith('#')) return value;
    if (value.startsWith('rgb')) return value;
    if (value.startsWith('hsl')) return value;
    // For oklch, show a neutral gray as preview
    return '#888888';
  };

  // Quick preset colors
  const quickColors = [
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#ffffff' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Gray', value: '#6b7280' },
    { name: 'Orange', value: '#f97316' },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 0',
        position: 'relative',
      }}
    >
      {/* Label */}
      <span style={{ flex: 1, fontSize: '12px', color: '#000000' }}>{label}</span>

      {/* Color Swatch */}
      <button
        onClick={handleSwatchClick}
        style={{
          width: '28px',
          height: '28px',
          border: '2px solid #ccc',
          borderRadius: '4px',
          background: getDisplayColor(),
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
        title={`Click to edit: ${value}`}
      />

      {/* Text Input */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        style={{
          width: '150px',
          padding: '6px 8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#000',
          background: '#fff',
        }}
        placeholder="Enter color value..."
      />

      {/* Color Picker Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '12px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '240px',
          }}
        >
          {/* Color format label */}
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
            Current format: <strong>{value.startsWith('oklch') ? 'oklch' : value.startsWith('#') ? 'hex' : value.startsWith('rgb') ? 'rgb' : 'other'}</strong>
          </div>

          {/* Native color input (works with hex) */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
              Color Picker:
            </label>
            <input
              type="color"
              value={value.startsWith('#') ? value : '#888888'}
              onChange={(e) => onChange(e.target.value)}
              style={{ width: '100%', height: '60px', cursor: 'pointer', borderRadius: '4px' }}
            />
          </div>

          {/* Quick preset colors */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
              Quick Colors:
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {quickColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    onChange(color.value);
                    setInputValue(color.value);
                  }}
                  title={color.name}
                  style={{
                    width: '22px',
                    height: '22px',
                    border: inputValue === color.value ? '2px solid #000' : '1px solid #ccc',
                    borderRadius: '4px',
                    background: color.value,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Direct input */}
          <div>
            <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
              CSS Value:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                color: '#000',
                background: '#fff',
              }}
              placeholder="e.g., #ff0000, oklch(0.5 0.2 260), rgb(255,0,0)"
            />
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              marginTop: '8px',
              width: '100%',
              padding: '6px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#f5f5f5',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#000',
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

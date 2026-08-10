import React, { useState, useEffect } from 'react';

interface SliderInputProps {
  label: string;
  tokenKey: string;
  value: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: string) => void;
}

// Helper to strip unit from value for display
const stripUnit = (value: string, unit: string): string => {
  // Remove the unit suffix if present
  if (value.endsWith(unit)) {
    return value.slice(0, -unit.length);
  }
  // Try to extract just the number
  const match = value.match(/^([\d.]+)/);
  return match ? match[1] : value;
};

// Helper to add unit to value
const addUnit = (value: string, unit: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return `${num}${unit}`;
};

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  tokenKey,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => {
  // Display only the number (without unit)
  const [inputValue, setInputValue] = useState(() => stripUnit(value, unit));

  // Parse numeric value from string (strip unit first)
  const numericValue = parseFloat(stripUnit(value, unit)) || 0;

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(stripUnit(value, unit));
  }, [value, unit]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseFloat(e.target.value);
    const displayValue = num.toString();
    const storageValue = addUnit(displayValue, unit);
    setInputValue(displayValue);
    onChange(storageValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Parse and validate
    const num = parseFloat(newValue);
    if (!isNaN(num)) {
      onChange(addUnit(newValue, unit));
    }
  };

  const handleInputBlur = () => {
    // Reset to current value on blur if invalid
    setInputValue(stripUnit(value, unit));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      {/* Label */}
      <span style={{ width: '100px', fontSize: '12px', color: '#000000' }}>{label}</span>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={handleSliderChange}
        style={{ flex: 1 }}
      />

      {/* Input with unit suffix */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          style={{
            width: '60px',
            padding: '4px 24px 4px 6px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            textAlign: 'right',
          }}
        />
        {/* Unit suffix */}
        <span
          style={{
            position: 'absolute',
            right: '6px',
            fontSize: '10px',
            color: '#666',
            pointerEvents: 'none',
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
};

export default SliderInput;

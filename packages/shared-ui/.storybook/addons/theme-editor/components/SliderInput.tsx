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
  const [inputValue, setInputValue] = useState(value);

  // Parse numeric value from string
  const numericValue = parseFloat(value) || 0;

  // Update input when value changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = `${e.target.value}${unit}`;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Parse and validate
    const num = parseFloat(newValue);
    if (!isNaN(num)) {
      onChange(`${num}${unit}`);
    }
  };

  const handleInputBlur = () => {
    // Reset to current value on blur if invalid
    setInputValue(value);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      {/* Label */}
      <span style={{ width: '100px', fontSize: '12px', color: '#333' }}>{label}</span>

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

      {/* Input */}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        style={{
          width: '80px',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          textAlign: 'right',
        }}
      />
    </div>
  );
};

export default SliderInput;

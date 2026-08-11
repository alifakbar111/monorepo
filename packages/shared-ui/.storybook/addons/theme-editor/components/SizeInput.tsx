import React, { useEffect, useState } from 'react'

type Unit = 'rem' | 'px'

const REM_TO_PX = 16

interface SizeInputProps {
  label: string
  tokenKey: string
  value: string
  onChange: (value: string) => void
}

// Parses a CSS size value into its number and unit. Falls back to 'rem' when
// the value carries no recognizable unit (older unitless defaults).
const parseValue = (value: string): { num: number; unit: Unit } => {
  const match = value.match(/^([\d.]+)\s*(rem|px)?$/);
  if (!match) {
    return { num: parseFloat(value) || 0, unit: 'rem' };
  }
  const [, numStr, unit] = match;
  return { num: parseFloat(numStr) || 0, unit: (unit as Unit) || 'rem' };
};

// Converts a number between rem/px so switching the unit preserves the same
// rendered size (16px = 1rem), instead of just relabeling the same digits.
const convert = (num: number, from: Unit, to: Unit): number => {
  if (from === to) return num;
  const px = from === 'rem' ? num * REM_TO_PX : num;
  const result = to === 'rem' ? px / REM_TO_PX : px;
  return Math.round(result * 10000) / 10000;
};

export const SizeInput: React.FC<SizeInputProps> = ({ label, value, onChange }) => {
  const parsed = parseValue(value);
  const [numInput, setNumInput] = useState(String(parsed.num));
  const [unit, setUnit] = useState<Unit>(parsed.unit);

  useEffect(() => {
    const next = parseValue(value);
    setNumInput(String(next.num));
    setUnit(next.unit);
  }, [value]);

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setNumInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(`${num}${unit}`);
    }
  };

  const handleNumberBlur = () => {
    setNumInput(String(parseValue(value).num));
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextUnit = e.target.value as Unit;
    const converted = convert(parseFloat(numInput) || 0, unit, nextUnit);
    setUnit(nextUnit);
    setNumInput(String(converted));
    onChange(`${converted}${nextUnit}`);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      <span style={{ width: '140px', fontSize: '12px', color: '#000000' }}>{label}</span>

      <input
        type="text"
        value={numInput}
        onChange={handleNumberChange}
        onBlur={handleNumberBlur}
        style={{
          width: '70px',
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          textAlign: 'right',
        }}
      />

      <select
        value={unit}
        onChange={handleUnitChange}
        style={{
          padding: '4px 6px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#000000',
          background: '#fff',
        }}
      >
        <option value="rem">rem</option>
        <option value="px">px</option>
      </select>
    </div>
  )
}

export default SizeInput

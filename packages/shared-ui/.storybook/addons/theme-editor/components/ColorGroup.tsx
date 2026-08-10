import React, { useState } from 'react'

import type { TokenGroup, TokenDefinition } from '../types'
import ColorPicker from './ColorPicker'
import SliderInput from './SliderInput'

interface ColorGroupProps {
  group: TokenGroup
  tokens: Record<string, string>
  onUpdate: (key: string, value: string) => void
}

// Helper to strip unit from value for display
const stripUnit = (value: string, unit: string): string => {
  if (value.endsWith(unit)) {
    return value.slice(0, -unit.length);
  }
  const match = value.match(/^([\d.]+)/);
  return match ? match[1] : value;
};

export const ColorGroup: React.FC<ColorGroupProps> = ({ group, tokens, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Render token based on its type
  const renderToken = (token: TokenDefinition) => {
    const value = tokens[token.key] || token.defaultValue;

    // Size tokens use slider
    if (token.type === 'size' && token.min !== undefined && token.max !== undefined && token.unit) {
      return (
        <SliderInput
          key={token.key}
          label={token.label}
          tokenKey={token.key}
          value={stripUnit(value, token.unit)}
          min={token.min}
          max={token.max}
          step={token.step || 0.1}
          unit={token.unit}
          onChange={(newValue) => onUpdate(token.key, newValue)}
        />
      );
    }

    // Color tokens use color picker
    return (
      <ColorPicker
        key={token.key}
        label={token.label}
        tokenKey={token.key}
        value={value}
        onChange={(newValue) => onUpdate(token.key, newValue)}
      />
    );
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '8px',
          border: 'none',
          background: '#f5f5f5',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          textAlign: 'left',
          color: '#000000',
        }}
      >
        <span
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          ▶
        </span>
        {group.label}
        <span style={{ marginLeft: 'auto', color: '#000000', fontWeight: 400 }}>
          {group.tokens.length}
        </span>
      </button>

      {/* Token List */}
      {isExpanded && (
        <div style={{ padding: '8px 0' }}>
          {group.tokens.map(renderToken)}
        </div>
      )}
    </div>
  )
}

export default ColorGroup

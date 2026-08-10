import React, { useState } from 'react'

import type { TokenGroup } from '../types'
import ColorPicker from './ColorPicker'

interface ColorGroupProps {
  group: TokenGroup
  tokens: Record<string, string>
  onUpdate: (key: string, value: string) => void
}

export const ColorGroup: React.FC<ColorGroupProps> = ({ group, tokens, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(true)

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
          {group.tokens.map((token) => (
            <ColorPicker
              key={token.key}
              label={token.label}
              tokenKey={token.key}
              value={tokens[token.key] || token.defaultValue}
              onChange={(value) => onUpdate(token.key, value)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ColorGroup

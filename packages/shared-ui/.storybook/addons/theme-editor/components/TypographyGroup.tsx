import React, { useState } from 'react';
import FontSelector from './FontSelector';

interface TypographyGroupProps {
  tokens: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export const TypographyGroup: React.FC<TypographyGroupProps> = ({
  tokens,
  onUpdate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▶
        </span>
        Typography
      </button>

      {/* Token List */}
      {isExpanded && (
        <div style={{ padding: '8px 0' }}>
          <FontSelector
            label="Sans Serif Font"
            tokenKey="--font-sans"
            value={tokens['--font-sans'] || ''}
            onChange={(value) => onUpdate('--font-sans', value)}
          />
          <FontSelector
            label="Monospace Font"
            tokenKey="--font-mono"
            value={tokens['--font-mono'] || ''}
            onChange={(value) => onUpdate('--font-mono', value)}
          />
        </div>
      )}
    </div>
  );
};

export default TypographyGroup;

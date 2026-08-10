import React, { useState } from 'react';
import SliderInput from './SliderInput';

interface SizeGroupProps {
  tokens: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export const SizeGroup: React.FC<SizeGroupProps> = ({
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
        }}
      >
        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▶
        </span>
        Spacing & Radius
      </button>

      {/* Token List */}
      {isExpanded && (
        <div style={{ padding: '8px 0' }}>
          <SliderInput
            label="Border Radius"
            tokenKey="--radius"
            value={tokens['--radius'] || '0.6rem'}
            min={0}
            max={2}
            step={0.1}
            unit="rem"
            onChange={(value) => onUpdate('--radius', value)}
          />
          <SliderInput
            label="Spacing"
            tokenKey="--spacing"
            value={tokens['--spacing'] || '0.25rem'}
            min={0.1}
            max={1}
            step={0.05}
            unit="rem"
            onChange={(value) => onUpdate('--spacing', value)}
          />
        </div>
      )}
    </div>
  );
};

export default SizeGroup;

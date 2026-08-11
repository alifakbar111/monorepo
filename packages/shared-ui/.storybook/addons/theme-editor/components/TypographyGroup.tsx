import React, { useState } from 'react';
import FontRoleInput from './FontRoleInput';

interface TypographyGroupProps {
  tokens: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
  fontSourceUrls: Record<string, string>;
  onSourceUrlUpdate: (key: string, url: string) => void;
}

export const TypographyGroup: React.FC<TypographyGroupProps> = ({
  tokens,
  onUpdate,
  fontSourceUrls,
  onSourceUrlUpdate,
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
          <FontRoleInput
            label="Heading Font"
            tokenKey="--font-heading"
            value={tokens['--font-heading'] || ''}
            onChange={(value) => onUpdate('--font-heading', value)}
            sourceUrl={fontSourceUrls['--font-heading'] || ''}
            onSourceUrlChange={(url) => onSourceUrlUpdate('--font-heading', url)}
          />
          <FontRoleInput
            label="Body / Text Font"
            tokenKey="--font-sans"
            value={tokens['--font-sans'] || ''}
            onChange={(value) => onUpdate('--font-sans', value)}
            sourceUrl={fontSourceUrls['--font-sans'] || ''}
            onSourceUrlChange={(url) => onSourceUrlUpdate('--font-sans', url)}
          />
          <FontRoleInput
            label="Mono Font"
            tokenKey="--font-mono"
            value={tokens['--font-mono'] || ''}
            onChange={(value) => onUpdate('--font-mono', value)}
            sourceUrl={fontSourceUrls['--font-mono'] || ''}
            onSourceUrlChange={(url) => onSourceUrlUpdate('--font-mono', url)}
          />
        </div>
      )}
    </div>
  );
};

export default TypographyGroup;

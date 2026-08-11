import React from 'react'

interface FontRoleInputProps {
  label: string
  tokenKey: string
  value: string
  onChange: (value: string) => void
  sourceUrl: string
  onSourceUrlChange: (url: string) => void
}

export const FontRoleInput: React.FC<FontRoleInputProps> = ({
  label,
  value,
  onChange,
  sourceUrl,
  onSourceUrlChange,
}) => {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#000000', marginBottom: '4px' }}>
        {label}
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ width: '32px', fontSize: '10px', color: '#666' }}>name:</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='"Merriweather", serif'
          style={{
            flex: 1,
            padding: '4px 6px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ width: '32px', fontSize: '10px', color: '#666' }}>url:</span>
        <input
          type="text"
          value={sourceUrl}
          onChange={(e) => onSourceUrlChange(e.target.value)}
          placeholder="https://fonts.googleapis.com/css2?family=..."
          style={{
            flex: 1,
            padding: '4px 6px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

export default FontRoleInput

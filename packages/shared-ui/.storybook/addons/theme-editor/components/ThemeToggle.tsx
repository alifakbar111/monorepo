import React from 'react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: (theme: 'light' | 'dark') => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
}) => {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <button
        onClick={() => onToggle('light')}
        style={{
          padding: '4px 8px',
          border: `1px solid ${theme === 'light' ? '#007bff' : '#ccc'}`,
          borderRadius: '4px',
          background: theme === 'light' ? '#007bff' : '#fff',
          color: theme === 'light' ? '#fff' : '#333',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        ☀️ Light
      </button>
      <button
        onClick={() => onToggle('dark')}
        style={{
          padding: '4px 8px',
          border: `1px solid ${theme === 'dark' ? '#007bff' : '#ccc'}`,
          borderRadius: '4px',
          background: theme === 'dark' ? '#007bff' : '#fff',
          color: theme === 'dark' ? '#fff' : '#333',
          cursor: 'pointer',
          fontSize: '11px',
        }}
      >
        🌙 Dark
      </button>
    </div>
  );
};

export default ThemeToggle;

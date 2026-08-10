import type { Decorator } from '@storybook/react';
import { useEffect } from 'react';
import { DEFAULT_TOKENS, EVENT_KEY } from './constants';
import { applyTokens } from './tokenUtils';

// Theme editor decorator
export const withThemeEditor: Decorator = (Story, context) => {
  useEffect(() => {
    // Apply default tokens on mount
    applyTokens(DEFAULT_TOKENS);

    // Listen for theme updates from manager
    const handleThemeUpdate = (event: MessageEvent) => {
      if (event.data?.type === EVENT_KEY) {
        applyTokens(event.data.payload);
      }
    };

    window.addEventListener('message', handleThemeUpdate);
    return () => window.removeEventListener('message', handleThemeUpdate);
  }, []);

  return <Story />;
};

// Export decorators for preview.ts
export const decorators = [withThemeEditor];

import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import { DEFAULT_TOKENS, EVENT_KEY } from './addons/theme-editor/constants';
import { applyTokens } from './addons/theme-editor/tokenUtils';

// Theme editor decorator
const withThemeEditor = (Story: any, context: any) => {
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

  return React.createElement(Story, context);
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withThemeEditor],
};

export default preview;

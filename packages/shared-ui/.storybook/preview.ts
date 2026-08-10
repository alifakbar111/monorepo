import type { Preview } from '@storybook/react';
import { withThemeEditor } from './addons/theme-editor/preview';

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

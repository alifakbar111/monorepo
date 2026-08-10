import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { ThemeEditor } from './components/ThemeEditor';
import { ADDON_ID, PANEL_ID } from './constants';

// Register the addon panel
addons.register(ADDON_ID, (api) => {
  addons.add(PANEL_ID, {
    title: 'Theme Editor',
    type: types.PANEL,
    render: ({ active, key }: { active: boolean; key: string }) => {
      return React.createElement(ThemeEditor, { key });
    },
    paramKey: 'themeEditor',
  });
});

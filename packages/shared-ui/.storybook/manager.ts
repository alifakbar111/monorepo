/* @ref: https://storybook.js.org/docs/configure/user-interface/theming/ */
import React from 'react';
import { addons, types } from 'storybook/manager-api';
import { themes } from 'storybook/theming';
import { ThemeEditor } from './addons/theme-editor/components/ThemeEditor';
import { ADDON_ID, PANEL_ID } from './addons/theme-editor/constants';

addons.setConfig({
  theme: themes.dark,
  sidebar: {
    showRoots: false,
    collapsedRoots: ["other"],
  },
  panelPosition: "right",
  enableShortcuts: false,
  isFullscreen: false,
  showNav: true,
  showPanel: true,
  showToolbar: true,
  toolbar: {
    copy: { hidden: true },
    eject: { hidden: false },
    fullscreen: { hidden: true },
    title: { hidden: false },
    zoom: { hidden: false },
    "storybook/viewport": { hidden: false },
    "storybook/outline": { hidden: false },
  },
  initialActive: "sidebar",
  selectedPanel: "controls",
});

// Register the Theme Editor addon panel
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

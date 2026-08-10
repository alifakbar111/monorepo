import { addons, types } from 'storybook/manager-api';
import { ThemeEditor } from './components/ThemeEditor';
import { ADDON_ID, PANEL_ID } from './constants';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Add the panel
  addons.add(PANEL_ID, {
    title: 'Theme Editor',
    type: types.PANEL,
    render: ({ active, key }) => (
      <ThemeEditor key={key} />
    ),
    paramKey: 'themeEditor',
  });
});

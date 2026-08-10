// Theme Editor Addon - Preset entry point
// This file is required by Storybook to load the addon

module.exports = {
  managerEntry: require.resolve('./manager.ts'),
  previewEntry: require.resolve('./preview.ts'),
};

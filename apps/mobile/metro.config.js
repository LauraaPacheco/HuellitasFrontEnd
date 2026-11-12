// Expo configura automáticamente los workspaces del monorepo.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);

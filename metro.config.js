// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Block Android build directories from being watched
config.resolver = {
  ...config.resolver,
  blockList: [
    /android\/app\/build\/.*/,
    /android\/build\/.*/,
  ],
};

module.exports = config;
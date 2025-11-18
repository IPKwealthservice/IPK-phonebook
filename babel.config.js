module.exports = function (api) {
  api.cache(true);
  return {
    // Use Expo's preset and load NativeWind as a preset (not a plugin).
    // NativeWind's export returns a preset config ({ plugins: [...] }),
    // so placing it under `plugins` causes: 
    // 
    //   .plugins is not a valid Plugin property
    // 
    // Moving it to `presets` resolves that error.
    presets: ["babel-preset-expo", "nativewind/babel"],
  };
};

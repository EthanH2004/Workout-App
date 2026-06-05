module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be the LAST plugin. In Reanimated 4 this path re-exports
      // react-native-worklets/plugin (the worklets transform powers Reanimated).
      'react-native-reanimated/plugin',
    ],
  };
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets precisa ser o último plugin da lista (Reanimated 4 — ver changelog
    // do pacote: o transform de worklets saiu de react-native-reanimated/plugin pra cá).
    plugins: ['react-native-worklets/plugin'],
  };
};

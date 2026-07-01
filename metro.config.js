const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['web', 'native', 'ios', 'android'];

// Force Babel to transform react-native source files (RN 0.81 has ES2022 syntax)
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Ensure react-native/src is NOT excluded from transformation
const origNodeModules = config.resolver.blockList;
config.transformer.unstable_allowRequireContext = true;

// Inject DOMException polyfill before all other modules
const origGetPolyfills = config.serializer?.getPolyfills;
config.serializer = {
  ...config.serializer,
  getPolyfills: (ctx) => {
    const defaults = origGetPolyfills ? origGetPolyfills(ctx) : [];
    return [path.resolve(__dirname, 'dom-polyfill.js'), ...defaults];
  },
};

module.exports = config;

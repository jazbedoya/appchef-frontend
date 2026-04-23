const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['web', 'native', 'ios', 'android'];

module.exports = config;

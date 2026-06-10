const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Required for dagre (CommonJS package)
config.resolver.unstable_enablePackageExports = false

module.exports = config

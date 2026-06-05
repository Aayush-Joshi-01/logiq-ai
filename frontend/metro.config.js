const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Required for dagre (CommonJS package)
config.resolver.unstable_enablePackageExports = false

module.exports = withNativeWind(config, { input: './global.css' })

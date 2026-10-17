const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('glb', 'gltf', 'obj', 'mtl');

// Dedupe: stats-gl (via drei) traz three@0.170 próprio; força todas as
// importações de 'three' para a cópia raiz (0.166) usada pelo app.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('three'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
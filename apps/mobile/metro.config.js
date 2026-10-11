// Metro necesita saber que el monorepo existe: por defecto solo mira
// dentro de apps/mobile y no encontraria @huellitas/shared.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const raizProyecto = __dirname;
const raizMonorepo = path.resolve(raizProyecto, '../..');

const config = getDefaultConfig(raizProyecto);

// Observamos el codigo compartido ademas de la app. Vigilar el monorepo
// entero agota los descriptores de archivo de macOS (EMFILE).
config.watchFolders = [path.resolve(raizMonorepo, 'packages/shared')];

config.resolver.nodeModulesPaths = [
  path.resolve(raizProyecto, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
];

// Ojo con dos ajustes que parecen buena idea y rompen la resolucion:
//
// 1. disableHierarchicalLookup: sirve con pnpm, pero npm anida paquetes
//    (expo-modules-core vive dentro de node_modules/expo/node_modules) y
//    Metro necesita poder subir por el arbol para encontrarlos.
// 2. Un blockList generico como /dist/: muchos paquetes publican su codigo
//    compilado ahi, asi que quedarian invisibles.

module.exports = config;

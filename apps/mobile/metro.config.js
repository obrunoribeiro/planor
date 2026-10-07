// Metro precisa saber que o monorepo existe: por padrão ele só enxerga apps/mobile, e os
// pacotes @planor/ui e @planor/shared vivem fora daqui (ver CONTEXTO.md §3).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Observa o monorepo inteiro, não só apps/mobile — assim o Metro recarrega quando um arquivo
// de packages/ui ou packages/shared muda.
config.watchFolders = [workspaceRoot];

// Com node-linker=hoisted (.npmrc da raiz), os pacotes do workspace ficam achatados no
// node_modules da raiz — o Metro precisa procurar lá também, não só em apps/mobile/node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;

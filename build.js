'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
const { buildSync } = require('esbuild');
const { execSync } = require('child_process');

const defaultOptions = {
  entryPoints: ['index.js'],
  bundle: true,
  outdir: 'build',
  platform: 'node',
  external: ['homey'],
  minify: true,
  treeShaking: true,
};

// CommonJS build
buildSync({
  ...defaultOptions,
  ...{
    format: 'cjs',
  },
});

// ESM build
buildSync({
  ...defaultOptions,
  ...{
    format: 'esm',
    outExtension: {
      '.js': '.mjs',
    },
  },
});

// Generate types
execSync('npm run typings:generate');

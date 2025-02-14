'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies,node/no-unpublished-require
const { buildSync } = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');

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

// Replace HomeyInstance in typing
const typingFile = 'build/index.d.ts';
const data = fs.readFileSync(typingFile, 'utf8');
const result = data.replace(/HomeyInstance/g, "import('homey/lib/Homey').default");
fs.writeFileSync(typingFile, result, 'utf8');

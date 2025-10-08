'use strict';

import {buildSync} from 'esbuild';
import {execSync} from 'child_process';
import fs from 'fs';

const defaultOptions = {
  entryPoints: ['index.mjs'],
  bundle: true,
  outdir: 'build',
  platform: 'node',
  external: ['homey'],
  minify: true,
  treeShaking: true,
};

// CommonJS build
const cjsResult = buildSync({
  ...defaultOptions,
  ...{
    format: 'cjs',
    metafile: true,
  },
});
fs.writeFileSync('build/cjs_meta.json', JSON.stringify(cjsResult.metafile));

// ESM build
const esmResult = buildSync({
  ...defaultOptions,
  ...{
    format: 'esm',
    outExtension: {
      '.js': '.mjs',
    },
    metafile: true,
  },
});
fs.writeFileSync('build/esm_meta.json', JSON.stringify(esmResult.metafile));

// Generate types
execSync('npm run typings:generate');

// Replace HomeyInstance in typing
const data = fs.readFileSync('build/index.d.mts', 'utf8');
fs.rmSync('build/index.d.mts');
const result = data.replace(/HomeyInstance/g, "import('homey/lib/Homey').default");
fs.writeFileSync('build/index.d.ts', result, 'utf8');

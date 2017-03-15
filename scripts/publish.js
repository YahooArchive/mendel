#!/usr/bin/env node
const {execSync} = require('child_process');
const origCwd = process.cwd();
[
    'packages/karma-mendel',
    'packages/mendel-config',
    'packages/mendel-deps',
    'packages/mendel-development-middleware',
    'packages/mendel-exec',
    'packages/mendel-generator-extract',
    'packages/mendel-generator-node-modules',
    'packages/mendel-generator-prune',
    'packages/mendel-manifest-uglify',
    'packages/mendel-middleware',
    'packages/mendel-mocha-runner',
    'packages/mendel-outlet-browser-pack',
    'packages/mendel-outlet-css',
    'packages/mendel-outlet-manifest',
    'packages/mendel-outlet-server-side-render',
    'packages/mendel-parser-json',
    'packages/mendel-pipeline',
    'packages/mendel-resolver',
    'packages/mendel-transform-babel',
    'packages/mendel-transform-less',
].forEach(pkgPath => {
    process.chdir(pkgPath);
    console.log(execSync('npm publish').toString().trim());
    process.chdir(origCwd);
});

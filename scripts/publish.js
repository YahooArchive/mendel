#!/usr/bin/env node
const {execSync} = require('child_process');
const origCwd = process.cwd();
[
    'packages/karma-mendel',
    'packages/mendel-config',
    'packages/mendel-deps',
    'packages/mendel-exec',
    'packages/mendel-generator-extract',
    'packages/mendel-generator-node-modules',
    'packages/mendel-manifest-uglify',
    'packages/mendel-mocha-runner',
    'packages/mendel-outlet-browser-pack',
    'packages/mendel-outlet-css',
    'packages/mendel-outlet-manifest',
    'packages/mendel-parser-json',
    'packages/mendel-pipeline',
    'packages/mendel-resolver',
    'packages/mendel-transform-babel',
    'packages/mendel-transform-less',
    'packages/mendel2-development-middleware',
].forEach(pkgPath => {
    process.chdir(pkgPath);
    console.log(execSync('npm publish').toString().trim());
    process.chdir(origCwd);
});

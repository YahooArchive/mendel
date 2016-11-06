#!/usr/bin/env node
/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var program = require('commander');

program
    .version(require(path.resolve(__dirname, './package.json')).version)
    .option('-v, --verbose', 'Verbose mode')
    .option(
        '-C, --config [config]',
        '.mendelrc or package.json path to load config')
    .option(
        '-N, --no-config', "don't load config from cwd")
    .option(
        '-V, --variations <variations>',
        'comma separated list of variations, defaults to all variations',
        arrayArg)
    .option(
        '-B, --no-variations', "runs only base variation", arrayArg)
    .option(
        '-O, --only <bundles>',
        'comma separated list of bundles to run, defaults to all bundles',
        arrayArg)
    .parse(process.argv);

if (program.verbose) {
    var debug = (process.env.DEBUG || '').split(',').filter(Boolean);
    debug.push('mendel*');
    process.env.DEBUG = debug.join(',');
}

function arrayArg(arg) {
  return (arg||'').split(',').filter(Boolean);
}

var mendelRunner = require('./mendel-browserify-runner');

mendelRunner({}, program);

#!/usr/bin/env node
const mendelPipeline = require('./pipeline');
const config = require('../../mendel-config');
const program = require('commander');
const path = require('path');

function parseIgnores(val='', previousIgnores) {
    return previousIgnores.concat(
        val.split(',')
        .map(splitted => splitted.trim())
        .filter(Boolean)
    );
}

program
    .version('0.1.0')
    .usage('[options] <dir path>')
    .option('--ignore <patterns>', 'Comma separated ignore glob patterns', parseIgnores, ['**/_test_/**', '**/_browser_test_/**', '**/assets/**'])
    // .option('-v, --verbose', 'Verbose mode')
    .option('-w, --watch', 'Watch mode', false)
    .parse(process.argv);

// Example usage
const mendelConfig = config(Object.assign(program, {cwd: path.resolve(process.cwd(), program.args[0])}));
mendelPipeline(mendelConfig);

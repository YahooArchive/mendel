#!/usr/bin/env node
const mendelPipeline = require('./pipeline');
const program = require('commander');

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
// time node src/cli.js ~/dev/norrin/src/
mendelPipeline(program.args[0], Object.assign(program, {
    commonTransformIds: ['babel1'],
    transforms: {
        babel1: {
            plugin: 'mendel-ift-babel',
            options:  {
                presets: [
                    'es2015',
                    'react',
                ],
                plugins: [
                ],
            },
        },
    },
    bundles: {
        main: {
            transform: ['babel1'],
            entries: ['src/apps/mail/index.js'],
        },
    },
    basetree: 'base',
    variationsdir: 'variations',
}));

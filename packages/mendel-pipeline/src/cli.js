#!/usr/bin/env node
/* eslint max-len: "off" */
const program = require('commander');
const path = require('path');
const MendelPipelineDaemon = require('./daemon');

process.env.MENDELRC = process.env.MENDELRC || '.mendelrc_v2';

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


const cliOptions = Object.assign(program, {
    cwd: path.resolve(process.cwd(), program.args[0]),
});

if (program.watch) {
    const daemon = new MendelPipelineDaemon(cliOptions);
    daemon.watch();
} else {
    /* TODO:
        request.get(defaultDeamonAddres + '/status', (error, response) => {
            if (error && isConnectionRefused(error)) {
                const daemon = new MendelPipelineDaemon(cliOptions);
                daemon.run();
            } else {
                request({
                    url: defaultDeamonAddres + '/run',
                    query: cliOptions,
                });
            }
        });
    */
    const daemon = new MendelPipelineDaemon(cliOptions);
    daemon.run();
}



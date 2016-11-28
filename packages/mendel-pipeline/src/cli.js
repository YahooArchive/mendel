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


if (program.watch) {
    const daemon = new MendelPipelineDaemon(program);
    daemon.watch();

    // TODO: real client, this is just for testing
    // Try $ DEBUG=*net* mendel-pipeline --watch
    const mendelConfig = require('../../mendel-config');
    const CacheClient = require('./cache/client');
    new CacheClient(mendelConfig(program));
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
    const daemon = new MendelPipelineDaemon(program);
    daemon.run();
}



#!/usr/bin/env node
/* eslint max-len: "off" */
const program = require('commander');
const chalk = require('chalk');
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
    .option('-o, --outlet', 'Write a mendel v1 compatible manifest', false)
    .parse(process.argv);


if (program.outlet) {
    const MendelClient = require('./client/build-all');
    const outlets = new MendelClient(program);
    outlets.run((error) => {
        if (error) process.exit(1);
        process.exit(0);
    });
} else if (program.watch) {
    const MendelPipelineDaemon = require('./daemon');
    const daemon = new MendelPipelineDaemon(program);
    daemon.watch();
} else {
    const Mendel = require('./main');
    const daemon = new Mendel(program);
    daemon.run((error) => {
        if (error) process.exit(1);
        setImmediate(() => process.exit(0));
    });

    const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
    const collector = require('./helpers/analytics/analytics-collector');
    collector.setOptions({
        printer: new AnalyticsCliPrinter({enableColor: true}),
    });

    process.on('SIGINT', () => {
        daemon.onForceExit();
        process.exit(1);
    });

    process.on('uncaughtException', (error) => {
        console.log([
            `Force closing due to a critcal error:\n`,
            chalk.red(error.stack),
        ].join(' '));
        daemon.onForceExit();
        process.exit(1);
    });

    // nodemon style shutdown
    process.once('SIGUSR2', () => process.kill(process.pid, 'SIGUSR2'));
}

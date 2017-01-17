#!/usr/bin/env node
const runner = require('./');
const program = require('commander');
const fs = require('fs');
const path = require('path');

/* eslint-disable max-len */
program
    .version(JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version)
    .usage('[debug] [options] [files]')
    .option('-c, --colors', 'force enabling of colors')
    .option('-C, --no-colors', 'force disabling of colors')
    .option('-O, --reporter-options <k=v,k2=v2,...>', 'reporter-specific options')
    .option('-R, --reporter <name>', 'specify the reporter to use', 'spec')
    .option('-b, --bail', 'bail after first test failure')
    .option('-s, --slow <ms>', '"slow" test threshold in milliseconds [75]')
    .option('-t, --timeout <ms>', 'set test-case timeout in milliseconds [2000]')
    .option('-w, --watch', 'watch files for changes')
    .option('--check-leaks', 'check for global variable leaks')
    .option('--full-trace', 'display the full stack trace')
    .option('--inline-diffs', 'display actual/expected differences inline within each string')
    .option('--log-timer-events', 'Time events including external callbacks')
    .option('--retries <times>', 'set numbers of time to retry a failed test case')
    .option('--delay', 'wait for async suite definition');

/* eslint-enable max-len */
program.parse(process.argv);
runner(program.args, program);

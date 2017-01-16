#!/usr/bin/env node
const runner = require('./');

runner([
    '**/test/setup/*.js',
    '**/_test_/*.js',
]);

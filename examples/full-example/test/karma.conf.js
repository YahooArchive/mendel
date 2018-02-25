/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

// Karma configuration

module.exports = function(config) {
    config.set({
        // frameworks to use, please delcare 'mendel' first
        frameworks: ['mendel', 'jasmine'],

        // list of files / patterns to load in the browser
        // for use with mendel, list only your test files here
        files: ['../src/isomorphic/**/_test_/*.js'],

        // list of files to exclude
        // you should exclude auto-executing files, such as your app initialization
        exclude: ['isomorphic/base/main.js'],

        // preprocess matching files before serving them to the browser
        // please only use mendel, you can use test configuration to have different
        // transforms than production bundles (such as istanbul)
        preprocessors: {
            '../src/isomorphic/**/*.js': ['mendel'],
        },

        /*
            Most mendel options can be used here

            If you want to leverage .mendelrc environment overrides, you will
            only need the following here:

                mendel: {
                    environment: 'test',
                },

            This is encouraged since you can have your development daemon
            running and tests will execute quite fast, even if you have many
            environment configurations running in parallel.
        */
        mendel: {
            environment: 'test',
        },

        // any of these options are valid: https://github.com/istanbuljs/istanbuljs/blob/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-api/lib/config.js#L33-L39
        coverageIstanbulReporter: {
            // reports can be any that are listed here: https://github.com/istanbuljs/istanbuljs/tree/aae256fb8b9a3d19414dcf069c592e88712c32c6/packages/istanbul-reports/lib
            reports: ['html', 'lcovonly', 'text-summary'],
        },

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['jasmine-diff', 'spec', 'coverage-istanbul'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_ERROR,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: false,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: 1,
    });
};

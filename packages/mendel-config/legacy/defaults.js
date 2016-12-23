/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = function() {
    return {
        basedir: process.cwd(),
        outdir: 'mendel-build',
        bundlesoutdir: '',
        serveroutdir: '',
        bundleName: 'bundle',
        base: 'base',
        basetree: 'base',
        variationsdir: '',
        bundles: {},
        variations: {},
        env: {},
        environment: 'development',
    };
};

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = function() {
    const mendelEnv = process.env.MENDEL_ENV ||
                      process.env.NODE_ENV ||
                      'development';
    return {
        projectRoot: process.cwd(),
        'base-config': {
            id: 'base',
            dir: process.cwd(),
            outdir: process.cwd(),
        },
        'build-dir': 'build',
        'variation-config': {
            'variation-dirs': [],
            variations: {},
        },
        'cache-connection': {
            path: '.mendelipc',
        },
        'environment': mendelEnv,
        'route-config': {
            variation: '/mendel/:variations/:bundle',
            hash: '/mendel/:hash/:bundle',
        },
        transforms: {},
        types: {
            node_modules: {
                glob: [
                    /.*\/node_modules\/.*/,
                ],
                isResource: false,
                isBinary: false,
            },
        },
        outlets: [],
        generators: [],
        postgenerators: [],
        env: {},
        bundles: {},
        config: true,
        shim: {},
        defaultShim: {},
        ignores: [],
        // This controls whether outlet outputs to a file or a stream
        noout: false, // TODO re-evaluate whether we need this guy
        // In a large project, there are configuration/support/bootstrap code
        // that is not variational or should be bundled to browser.
        // Especially useful when the support code pulls in large dependency
        // that you do not want to process/transpile in all environments.
        // Takes (glob|path) as input.
        support: '',
    };
};

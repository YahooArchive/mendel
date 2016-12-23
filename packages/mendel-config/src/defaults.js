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
        types: {},
        outlets: [],
        generators: [],
        env: {},
        bundles: {},
        config: true,
        shim: {},
        defaultShim: {},
    };
};

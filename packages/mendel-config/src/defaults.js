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
        },
        'build-dir': 'build',
        'variation-config': {
            'variation-dirs': [],
            variations: {},
        },
        'environment': mendelEnv,
        'route-config': {
            variation: '/mendel/:variations/:bundle',
            hash: '/mendel/:hash/:bundle',
        },
        transforms: {},
        types: {},
        generators: {},
        env: {},
        bundles: {},
    };
};

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = manifestExtractBundles;

var debug = require('debug')('mendel-manifest-extract-bundles');

function manifestExtractBundles(manifests, options, next) {
    var fromManifest = manifests[options.from];
    var externalManifest = manifests[options.external];

    var fromFiles = Object.keys(fromManifest.indexes);
    var externalFiles = Object.keys(externalManifest.indexes);

    var intersection = externalFiles.filter(function(file) {
        return fromFiles.indexOf(file) >= 0;
    });

    debug([
        'found', intersection.length, 'files intersecting between',
        options.from, 'and', options.external
    ].join(' '));

    // Expose files on the source bundle
    intersection.forEach(function(file) {
        var moduleIndex = fromManifest.indexes[file];
        var bundle = fromManifest.bundles[moduleIndex];
        bundle.expose = bundle.id;
        bundle.variations.forEach(function(variation, index) {
            bundle.data[index].expose = bundle.id;
        });
    });

    // Make modules external on the external bundle
    // By removing files from the index, when the manifest is sorted and
    // validated, unreachable modules are removed.
    externalManifest.indexes = externalFiles.reduce(function(indexes, file) {
        if (-1 === intersection.indexOf(file)) {
            indexes[file] = externalManifest.indexes[file];
        }
        return indexes;
    }, {});

    // Also, we need to make sure deps are updated to "false", which marks
    // the dep as external
    Object.keys(externalManifest.indexes).forEach(function(file) {
        var bundle = externalManifest.bundles[externalManifest.indexes[file]];
        bundle.data.forEach(function(module) {
            Object.keys(module.deps).forEach(function(key) {
                var value = module.deps[key];
                if (intersection.indexOf(value) >=0) {
                    module.deps[key] = false;
                }
            });
        });
    });

    var remaining = Object.keys(externalManifest.indexes).length;
    debug([
        remaining, 'files remaining in',
        options.external, 'after extraction'
    ].join(' '));

    next(manifests);
}

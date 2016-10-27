/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = manifestExtractBundles;

var debug = require('debug')('mendel-manifest-extract-bundles');

function manifestExtractBundles(manifests, options, next) {
    var fromManifest = manifests[options.from];
    var externalManifest = manifests[options.external];

    var fromFiles = function() {
        return Object.keys(fromManifest.indexes);
    };
    var externalFiles = function() {
        return Object.keys(externalManifest.indexes);
    };

    // Modules that are exposed on "external" should be removed from main
    filterFilesFromManifest(fromManifest, function(file) {
        var modIndex = externalFiles().indexOf(file);
        var isExposedOnExternalBundle = false;
        if (-1 !== modIndex) {
            var externalMod = externalManifest.bundles[modIndex];
            if (externalMod.expose) {
                isExposedOnExternalBundle = true;
            }
        }
        return !isExposedOnExternalBundle;
    }, options.from);

    // Cleanup potetial sub-dependencies of removed files
    removeOrphans(fromManifest, options.from);

    // Files that exist on main should be removed from external
    var removedFromExternal = [];
    filterFilesFromManifest(externalManifest, function(file) {
        if (fromFiles().indexOf(file) >= 1) {
            removedFromExternal.push(file);
            return false;
        }
        return true;
    }, options.external);

    // Cleanup potetial sub-dependencies of removed files
    removeOrphans(externalManifest, options.external);

    // Files that exist on main and were removed from external bundle
    // should be exposed on main
    fromFiles().forEach(function(file) {
        var moduleIndex = fromManifest.indexes[file];
        var bundle = fromManifest.bundles[moduleIndex];
        if (removedFromExternal.indexOf(file) > -1) {
            bundle.expose = bundle.id;
            bundle.variations.forEach(function(variation, index) {
                bundle.data[index].expose = bundle.id;
            });
            debug(bundle.id + ' exposed on ' + options.from);
        }
    });

    debug([
        fromFiles().length, 'files remaining in',
        options.from, 'after extraction',
    ].join(' '));
    debug([
        externalFiles().length, 'files remaining in',
        options.external, 'after extraction',
    ].join(' '));

    next(manifests);
}

/*
receives a manifest and a "selector" function
modifies manifest indexes to include only files that selector returns truthy
*/
function filterFilesFromManifest(manifest, selector, logName) {
    // By removing files from the index, when the manifest is sorted and
    // validated, unreachable modules are removed.
    var removedFiles = [];
    manifest.indexes = Object.keys(manifest.indexes)
    .reduce(function(indexes, file) {
        if (selector(file)) {
            indexes[file] = manifest.indexes[file];
        } else {
            removedFiles.push(file);
            debug(file + ' removed from ' + logName);
        }
        return indexes;
    }, {});

    // Also, we need to make sure deps are updated to "false", which marks
    // the dep as external
    Object.keys(manifest.indexes).forEach(function(file) {
        var bundle = manifest.bundles[manifest.indexes[file]];
        bundle.data.forEach(function(module) {
            Object.keys(module.deps).forEach(function(key) {
                var value = module.deps[key];
                if (removedFiles.indexOf(value) >=0) {
                    module.deps[key] = false;
                }
            });
        });
    });
}

/*
walks the manifest dependencies and remove indexes that are unreachable
*/
function removeOrphans(manifest, logName) {
    var originalIndexes = Object.keys(manifest.indexes);

    // hashtable for number of time a bundle was visited
    var visitedIndexes = originalIndexes.reduce(function(indexes, file) {
        indexes[file] = false;
        return indexes;
    }, {});

    // recursive function to visit bundle and it's deps
    function visitBundle(file) {
        if (visitedIndexes[file]) {
            return;
        }
        visitedIndexes[file] = true;
        // walk deps
        var bundle = manifest.bundles[manifest.indexes[file]];
        bundle.data.forEach(function(module) {
            Object.keys(module.deps).forEach(function(key) {
                var value = module.deps[key];
                if (visitedIndexes.hasOwnProperty(value)) {
                    visitBundle(value);
                }
            });
        });
    }

    // start visiting from entries and exposed
    originalIndexes.forEach(function(file) {
        var bundle = manifest.bundles[manifest.indexes[file]];
        if (bundle.expose || bundle.entry) {
            visitBundle(file);
        }
    });

    filterFilesFromManifest(manifest, function(file) {
        return visitedIndexes.hasOwnProperty(file) && visitedIndexes[file];
    }, logName);
}


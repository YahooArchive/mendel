/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = sortManifest;

function sortManifest(manifest) {
    var inputIndexes = manifest.indexes;
    var inputBundles = manifest.bundles;
    var sortedManifest = {
        indexes: {},
        bundles: [],
    };

    Object.keys(inputIndexes).sort().forEach(function(file) {
        var bundle = inputBundles[inputIndexes[file]];
        sortedManifest.bundles.push(bundle);

        var index = sortedManifest.bundles.indexOf(bundle);
        sortedManifest.indexes[file] = index;
        bundle.index = index;

        bundle.data.forEach(function(dep) {
            var oldSubDeps = dep.deps;
            var newSubDeps = {};
            Object.keys(oldSubDeps).sort().forEach(function(key) {
                newSubDeps[key] = oldSubDeps[key];
            });
            dep.deps = newSubDeps;
        });

    });

    return sortedManifest;
}

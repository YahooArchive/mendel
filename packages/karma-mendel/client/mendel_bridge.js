/* Copyright 2018, Irae Carvalho,
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

/* global window, __mendel_module__, __mendel_config__ */

(function(window, modules, config, cache) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == 'function' && require;
    var variations = config.variations;
    var baseId = config.baseVariationId;
    var baseDir = config.baseVariationDir;

    function newRequire(name, variationId, jumped) {
        if (!cache[name] && variationId) {
            var allByNormId = Object.keys(modules).reduce(function(
                normMatches,
                id
            ) {
                if (modules[id].normalizedId === name) {
                    normMatches.push(modules[id]);
                }
                return normMatches;
            },
            []);
            var variation = variations.find(function(_) {
                return _.id === variationId;
            });
            var found;
            for (var i = 0; i < variation.chain.length; i++) {
                var dir = variation.chain[i];
                found =
                    found ||
                    allByNormId.find(function(_) {
                        return _.variation === dir;
                    });
            }
            if (found) {
                name = found.id;
            }
        }
        if (!cache[name]) {
            if (!modules[name]) {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == 'function' && require;
                if (!jumped && currentRequire)
                    return currentRequire(name, variationId, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module "' + name + '"');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var m = (cache[name] = {exports: {}});
            modules[name].moduleFn.call(
                m.exports,
                function(x) {
                    var id = modules[name].deps[x];
                    return newRequire(id ? id : x, variationId);
                },
                m,
                m.exports
            );
        }
        return cache[name].exports;
    }

    // Run entry modules
    Object.keys(modules)
        .filter(function(id) {
            return Boolean(modules[id].entry);
        })
        .sort(function(aId, bId) {
            var a = modules[aId];
            var b = modules[bId];
            if (a.variation === baseDir) {
                return -1;
            }
            if (b.variation === baseDir) {
                return 1;
            }
            return 0;
        })
        .forEach(function(id) {
            var module = modules[id];
            var match = variationMatches(variations, module.id);
            if (match) {
                newRequire(id, match.variation.id);
            } else {
                newRequire(id, baseId);
            }
        });

    function variationMatches(variations, path) {
        if (path.indexOf('node_modules') >= 0) return;
        var result;
        variations.some(function(variation) {
            return variation.chain.some(function(dir) {
                var parts = path.split(new RegExp('/' + dir + '/'));
                var found = parts.length > 1;
                if (found)
                    result = {
                        variation: variation,
                        dir: dir,
                        file: parts[parts.length - 1],
                    };
                return found;
            });
        });
        return result;
    }

    // Override the current require with this new one
    window.require = newRequire;
})(window, __mendel_module__, __mendel_config__, []);

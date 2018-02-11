/* Copyright 2018, Irae Carvalho,
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

/* global window, __mendel_module__, __mendel_config__ */

(function(window, modules, config, cache) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == 'function' && require;
    var variations = config.variations;
    var base = config.baseVariationDir;

    function newRequire(name, variation, jumped) {
        if (!cache[name] && variation) {
            const foundByNormId = Object.keys(modules).find(id => {
                const item = modules[id];
                if (
                    name !== item.id &&
                    item.normalizedId === name &&
                    variation === item.variation
                ) {
                    return true;
                }
                return false;
            });
            if (foundByNormId) {
                name = foundByNormId;
            }
        }
        if (!cache[name]) {
            if (!modules[name]) {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == 'function' && require;
                if (!jumped && currentRequire)
                    return currentRequire(name, variation, true);

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
                    return newRequire(id ? id : x, variation);
                },
                m,
                m.exports
            );
        }
        return cache[name].exports;
    }

    // Run entry modules
    Object.keys(modules).forEach(function(id) {
        var module = modules[id];
        if (module.entry) {
            console.log('mendel starting entry ', module.id);
            const match = variationMatches(variations, module.id);
            if (match) {
                newRequire(id, match.variation.dir);
            } else {
                newRequire(id, base);
            }
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

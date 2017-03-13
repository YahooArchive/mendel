/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var pathToRegexp = require('path-to-regexp');
var bpack = require('browser-pack');
var MendelTrees = require('mendel-core');
var MendelLoader = require('mendel-loader');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var trees = MendelTrees(opts);

    var route = trees.config.hashroute || '/mendel/:hash/:bundle.js';
    var getPath = pathToRegexp.compile(route);
    var keys = [];
    var bundleRoute = pathToRegexp(route, keys);
    var bundles = trees.config.bundles.reduce(function(acc, bundle) {
        acc[bundle.id] = bundle;
        return acc;
    }, {});
    var loader = new MendelLoader(trees, {
        parentModule: module.parent,
    });

    return function(req, res, next) {
        req.mendel = req.mendel || {
            bundleCache: {},
            variations: false,
        };

        req.mendel.getBundleEntries = function(bundleId) {
            const bundleDeps = trees.bundles[bundleId].bundles;
            return bundleDeps
                .filter(dep =>  !!dep.expose || !!dep.entry)
                .map(dep => dep.id);
        };

        req.mendel.setVariations = function(variations) {
            if (req.mendel.variations === false) {
                var varsAndChains = trees.variationsAndChains(variations);
                req.mendel.variations = varsAndChains.matchingVariations;
                req.mendel.lookupChains = varsAndChains.lookupChains;
            }
            return req.mendel.variations;
        };

        req.mendel.getBundle = function(bundle) {
            if (!req.mendel.variations) {
                throw new Error('Please call req.mendel.setVariations first');
            }

            if(!req.mendel.bundleCache[bundle]) {
                var tree = trees.findTreeForVariations(
                                            bundle, req.mendel.lookupChains);
                req.mendel.bundleCache[bundle] = tree;
            }

            return req.mendel.bundleCache[bundle];
        };

        req.mendel.getURL = function(bundle, variations) {
            if (!req.mendel.variations && variations) {
                console.warn(
                    '[DEPRECATED] Please replace use of '+
                    'mendel.getURL(bundle, variations).'+
                    '\nUse mendel.setVariations(variations) followed by'+
                    ' mendel.getURL(bundle) instead.'
                );
                req.mendel.setVariations(variations);
            }
            var tree = req.mendel.getBundle(bundle);
            return getPath({ bundle: bundle, hash: tree.hash });
        };

        req.mendel.resolver = function(bundles, variations) {
            if (!req.mendel.variations && variations) {
                console.warn(
                    '[DEPRECATED] Please replace use of '+
                    'mendel.resolver(bundle, variations).'+
                    '\nUse mendel.setVariations(variations) followed by'+
                    ' mendel.resolver(bundle) instead.'
                );
                req.mendel.setVariations(variations);
            }

            return loader.resolver(bundles, req.mendel.lookupChains);
        };

        req.mendel.isSsrReady = loader.isSsrReady.bind(loader);

        // Match bundle route
        var reqParams = bundleRoute.exec(req.url);
        if (!reqParams) {
            return next();
        }
        var params = namedParams(keys, reqParams);
        if (!(
            params.bundle &&
            params.hash &&
            bundles[params.bundle]
        )) {
            return next();
        }

        var pack = bpack({raw: true, hasExports: true});
        var decodedResults = trees.findTreeForHash(params.bundle, params.hash);
        if (!decodedResults || decodedResults.error) {
            return notFound(res, decodedResults && decodedResults.error);
        }

        // Serve bundle
        res.set({
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000',
        });

        pack.pipe(res);
        var modules = indexedDeps(decodedResults.deps.filter(Boolean));
        for (var i = 0; i < modules.length; i++) {
            pack.write(modules[i]);
        }
        pack.end();
    };
}

/*
Here is a piece of hard to read JavaScript.
This compresses the bundle by renaming all dependency indexes from file paths
to a numbered index.

Here is a sample transformation:
[
  {
    "entry": true,
    "id": "/User/me/projects/site/src/main.js",
    "deps": {
      "./colors.js": "/User/me/projects/site/src/colors.js",
      "./shared.js": "/User/me/projects/site/src/shared.js"
    }
  },
  {
    "id": "/User/me/projects/site/src/colors.js",
    "deps": {
      "external-lib": false
    }
  },
  {
    "expose": "shared",
    "id": "/User/me/projects/site/src/shared.js",
    "deps": {}
  }
]

Should become:
[
  {
    "entry": true,
    "id": 1,
    "deps": {
      "./colors.js": 2,
      "./shared.js": "shared"
    }
  },
  {
    "id": 2,
    "deps": {
      "external-lib": false
    }
  },
  {
    "expose": "shared",
    "id": "shared",
    "deps": {}
  }
]

*/

function indexedDeps(mods) {
    // the index can't be ever 0 because 0 is false for browserify
    var newModIndex = [0];

    // indexes are created first, because deps can come unordered
    mods.forEach(function(mod){
        if (!mod.expose) newModIndex.push(mod.id);
    });

    // create a new array of modified modules
    return mods.map(function(oldMod) {
        return Object.keys(oldMod).reduce(function(newMod, prop) {

            if (prop === 'deps') { // deps needs to be reindexed
                newMod.deps = Object.keys(oldMod.deps).reduce(
                    function(newDeps, name) {
                        var id = oldMod.deps[name];
                        var index = newModIndex.indexOf(id);
                        if (index > -1) {
                            newDeps[name] = index;
                        } else {
                            // deps not indexed are exposed or external
                            newDeps[name] = id;
                        }
                        return newDeps;
                    },
                {});
            }


            else if(prop === 'id') { // id needs to be reindexed
                var index = newModIndex.indexOf(oldMod.id);
                if (index > -1) {
                    newMod.id = index;
                } else {
                    // unless it is entry or exposed
                    newMod.id = oldMod.expose || oldMod.id;
                }
            }

            else {
                // for all other props we just copy over
                newMod[prop] = oldMod[prop];
            }

            return newMod;
        }, {});
    });
}

/******

Here is a non-functional but more performant implementation of the same
transformation above. I don't think it would pay off in performance, but
I am keeping it here since I didn't benchmark. The above should be more
maintainable.

function indexedDeps(mods) {
    var i, key, deps, index, newId, newDeps, newMod, map, newMods;
    // indexes can't start with 0 because 0 is false for browserify runtime
    map = [''];
    // stores indexes
    for (i = 0; i < mods.length; i++) {
        if (mods[i].expose) continue;
        map.push(mods[i].id);
    }

    // create new mods
    newMods = [];
    for (i = 0; i < mods.length; i++) {
        // shallow copy original deps
        newMod = {};
        for(key in mods[i]) {
            newMod[key] = mods[i][key];
        }

        // create new deps
        deps = mods[i].deps;
        newDeps = {};
        for(key in deps) {
            index = map.indexOf(deps[key]);
            if (index > -1) {
                newDeps[key] = index;
            } else {
                newDeps[key] = deps[key];
            }
        }

        // replace props on new mod
        newId = map.indexOf(newMod.id);
        if (newId > -1) newMod.id = newId;
        newMod.deps = newDeps;
        newMods.push(newMod);
    }

    return newMods;
}

****/

function notFound(res, error) {
    var message = "Mendel: ";
    if (!error) {
        message += 'Bundle not found';
    } else {
        message += error.code + ' - ' + error.message;
    }
    res.status(404).send(message);
}

function namedParams(keys, reqParams) {
    return keys.reduce(function(params, param, index) {
        params[param.name] = reqParams[index+1];
        return params;
    }, {});
}

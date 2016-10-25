/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var Module = require('module');
var pathToRegexp = require('path-to-regexp');
var browserify = require('browserify');
var watchify = require('watchify');
var treenherit = require('mendel-treenherit');
var requirify = require('mendel-requirify');
var parseConfig = require('mendel-config');
var validVariations = require('mendel-config/variations');
var applyExtraOptions = require('mendel-development/apply-extra-options');
var resolveVariations = require('mendel-development/resolve-variations');
var variationMatches = require('mendel-development/variation-matches');
var CachedStreamCollection = require('./cached-stream-collection');
var MendelLoader = require('mendel-development-loader');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var config = parseConfig(opts);
    var existingVariations = validVariations(config);
    var base = config.base || 'base';

    existingVariations = existingVariations.concat({
        id: base,
        chain: [config.basetree || 'base'],
    });

    var route = config.variationsroute || '/mendel/:variations/:bundle\.js';
    var getPath = pathToRegexp.compile(route);
    var keys = [];
    var bundleRoute = pathToRegexp(route, keys);
    var bundles = config.bundles.reduce(function(acc, bundle) {
        acc[bundle.id] = bundle;
        return acc;
    }, {});

    var allDirs = existingVariations.reduce(function(allDirs, variation) {
        variation.chain.forEach(function(path) {
            if (-1 === allDirs.indexOf(path)) allDirs.push(path);
        });
        return allDirs;
    }, []);

    var loader = new MendelLoader(existingVariations, config, module.parent);

    return function(req, res, next) {
        req.mendel = req.mendel || {
            variations: false
        };

        req.mendel.getBundleEntries = function() {
            return Object.keys(bundles).reduce(

                function(outputBundles, id) {
                    var bundle = bundles[id];
                    var outputEntries = [];

                    [].concat(bundle.entries, bundle.require)
                    .filter(Boolean)
                    .forEach(
                        function(entry) {
                            var match = variationMatches(existingVariations, entry);
                            if (match) entry = match.file;
                            allDirs.forEach(function(dirPath) {
                                var absolutePath = path.resolve(
                                    config.basedir, dirPath, entry
                                );
                                if (-1 === outputEntries
                                    .indexOf(absolutePath)
                                ){
                                    outputEntries.push(absolutePath);
                                }
                            });
                        }
                    );

                    outputBundles[id] = outputEntries;
                    return outputBundles;
                },

                {} // outputBundles
            );
        };

        req.mendel.setVariations = function(variations) {
            if (req.mendel.variations === false) {
                req.mendel.variations = variations;
            }
            return req.mendel.variations;
        };

        req.mendel.getURL = function(bundle, variations) {
            if (!req.mendel.variations && variations) {
                console.warn(
                    'mendel.getURL(bundle, variations) is deprecated. '+
                    'Please use mendel.setVariations(variations), followed by'+
                    ' mendel.getURL(bundle).'
                );
                req.mendel.setVariations(variations);
            }
            var vars = req.mendel.variations.join(',') || config.base;
            return getPath({bundle: bundle, variations: vars});
        };

        req.mendel.resolver = function(bundles, variations) {
            if (!req.mendel.variations && variations) {
                console.warn(
                    'mendel.resolver([bundles], variations) is deprecated. '+
                    'Please use mendel.setVariations(variations), followed by'+
                    ' mendel.resolver([bundles]).'
                );
                req.mendel.setVariations(variations);
            }
            return loader.resolver(bundles, req.mendel.variations);
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
            params.variations &&
            bundles[params.bundle]
        )) {
            return next();
        }
        var bundleConfig = bundles[params.bundle];
        var dirs = params.variations.split(/(,|%2C)/i);
        dirs = resolveVariations(existingVariations, dirs);
        if (!dirs.length || !bundleConfig) {
            return next();
        }

        // Serve bundle
        res.header('content-type', 'application/javascript');

        bundleConfig = xtend(config, bundleConfig, {
            debug: true,
            cache: {},
            packageCache: {}
        });

        cachedStreamBundle(bundleConfig, dirs, function(bundleStream) {
            bundleStream.on('error', function(e) {
                console.error(e.stack);
                res.send('console.error( "Error compiling client bundle", ' +
                    JSON.stringify({ stack: e.stack }) + ')').end();
            });
            bundleStream.pipe(res);
        });
    };
}

function namedParams(keys, reqParams) {
    return keys.reduce(function(params, param, index) {
        params[param.name] = reqParams[index+1];
        return params;
    }, {});
}

var streamCache = new CachedStreamCollection();
function cachedStreamBundle(bundleConfig, dirs, cb) {
    var id = [bundleConfig.id].concat(dirs).join('/');
    if (streamCache.hasItem(id)) {
        return cb(streamCache.outputPipe(id));
    }

    getCachedWatchfy(id, bundleConfig, dirs, function(err, watchBundle) {
        // multiple kinds of error handling start
        function boundError(e) {
            streamCache.sendError(id, e);
        }
        if (err) return cb(boundError(err));

        function makeBundle() {
            var bundle = watchBundle.bundle();
            // multiple kinds of error handling end
            bundle.on('error', boundError);
            bundle.on('transform', function(tr) {
                tr.on('error', boundError);
            });

            streamCache.createItem(id);
            streamCache.inputPipe(id, bundle);
        }

        watchBundle.on('update', function(srcFiles) {
            streamCache.invalidateItem(id);
            invalidateNodeCache(dirs, srcFiles, bundleConfig.serveroutdir);
            makeBundle();
        });

        makeBundle();

        cb(streamCache.outputPipe(id));
    });
}

var watchfyCache = {};
function getCachedWatchfy(id, bundleConfig, dirs, cb) {
    if (watchfyCache[id]) {
        return cb(null, watchfyCache[id]);
    }

    // TODO: async lookup of entries
    bundleConfig.entries = normalizeEntries(bundleConfig.entries||[], bundleConfig);

    var bundler = browserify(bundleConfig);
    applyExtraOptions(bundler, bundleConfig);
    bundler.transform(treenherit, { dirs: dirs });
    bundler.plugin(watchify);

    if (bundleConfig.serveroutdir && bundleConfig.entries.length) {
        bundler.plugin(requirify, {
            dirs: dirs,
            outdir: bundleConfig.serveroutdir
        });
    }

    watchfyCache[id] = bundler;
    cb(null, watchfyCache[id]);
}

function normalizeEntries(entries, config) {
    return [].concat(entries).filter(Boolean)
    .map(function(entry) {
        if (typeof entry === 'string') {
            if(!fs.existsSync(path.join(config.basedir, entry))) {
                var messages = [
                    '[warn] paths relative to variation are deprecated',
                    'you can fix this by changing',
                    entry,
                    'in your configuration'
                ];
                console.log(messages.join(' '));
                entry = path.join(config.basedir, config.basetree, entry);
            }
        }
        return entry;
    });
}

function invalidateNodeCache(dirs, files, serveroutdir) {
    files.forEach(function(file) {
        var match = variationMatches([{chain: dirs}], file);
        if (match) {
            var fullPath = path.join(serveroutdir, match.dir, match.file);
            delete Module._cache[fullPath];
        }
    });
}

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var xtend = require('xtend');
var pathToRegexp = require('path-to-regexp');
var browserify = require('browserify');
var watchify = require('watchify');
var treenherit = require('mendel-treenherit');

var parseConfig = require('mendel-config');
var validVariations = require('mendel-config/variations');
var applyExtraOptions = require('mendel-development/apply-extra-options');
var resolveVariations = require('mendel-development/resolve-variations');
var swatch = require('./swatch-worker');
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

    // server side watch
    if (config.watch !== false) {
        var watcher = swatch.fork(opts); // eslint-disable-line no-unused-vars
    }

    var route = config.variationsroute || '/mendel/:variations/:bundle\.js';
    var getPath = pathToRegexp.compile(route);
    var keys = [];
    var bundleRoute = pathToRegexp(route, keys);
    var bundles = config.bundles.reduce(function(acc, bundle) {
        acc[bundle.id] = bundle;
        return acc;
    }, {});

    var loader = new MendelLoader(existingVariations, config, module.parent);

    return function(req, res, next) {
        req.mendel = req.mendel || {};

        req.mendel.getURL = function(bundle, variations) {
            var vars = variations.join(',') || config.base;
            return getPath({bundle: bundle, variations: vars});
        };

        req.mendel.resolver = loader.resolver.bind(loader);
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

        var bundleStream = cachedStreamBundle(bundleConfig, dirs);
        bundleStream.on('error', function(e) {
            console.error(e.stack);
            res.send('console.error( "Error compiling client bundle", ' +
                JSON.stringify({ stack: e.stack }) + ')').end();
        });
        bundleStream.pipe(res);
    };
}

function namedParams(keys, reqParams) {
    return keys.reduce(function(params, param, index) {
        params[param.name] = reqParams[index+1];
        return params;
    }, {});
}

var streamCache = new CachedStreamCollection();
function cachedStreamBundle(bundleConfig, dirs) {
    var id = [bundleConfig.id].concat(dirs).join('/');
    if (!streamCache.hasItem(id)) {
        streamCache.createItem(id);

        getCachedWatchfy(id, bundleConfig, dirs, function(err, watchBundle) {
            // multiple kinds of error handling start
            function boundError(e) {
                streamCache.sendError(id, e)
            }
            if (err) return boundError(err);

            var bundle = watchBundle.bundle();
            bundle.on('error', boundError);
            bundle.on('transform', function(tr) {
                tr.on('error', boundError);
            });
            // multiple kinds of error handling end

            watchBundle.on('update', function() {
                streamCache.invalidateItem(id);
            });
            streamCache.inputPipe(id, bundle);
        });
    }

    return streamCache.outputPipe(id);
}

var watchfyCache = {};
function getCachedWatchfy(id, bundleConfig, dirs, cb) {
    if (watchfyCache[id]) {
        return cb(null, watchfyCache[id]);
    }

    // TODO: async lookup of entries
    bundleConfig.entries = (bundleConfig.entries||[]).map(function(entry) {
        return path.join(bundleConfig.basetree, entry);
    });

    var bundler = browserify(bundleConfig);
    applyExtraOptions(bundler, bundleConfig);
    bundler.transform(treenherit, { dirs: dirs });
    bundler.plugin(watchify);

    watchfyCache[id] = bundler;
    cb(null, watchfyCache[id]);
}

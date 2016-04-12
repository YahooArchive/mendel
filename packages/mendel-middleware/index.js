
var express = require('express');
var StreamCache = require('stream-cache');
var browserify = require('browserify');
var Swatch = require('./swatch');
var watchify = require('watchify');
var path = require('path');
var xtend = require('xtend');

var parseConfig = require('./lib/config');
var validVariations = require('./lib/variations');
var treenherit = require('mendel-treenherit');

module.exports = MendelMiddleware;

function MendelMiddleware(opts) {
    var router = express.Router();
    var config = parseConfig(opts);
    var existingVariations = validVariations(config);
    var base = config.base || 'base';
    var routePath = '/mendel/:variations/:bundle\.js' || opts.path;

    existingVariations = existingVariations.concat({
        id: base,
        chain: [config.basetree || 'base'],
    });

    // server side watch
    var swatch = new Swatch({
        basedir: opts.basedir,
        outdir: opts.mountdir,
        variations: existingVariations
    });

    swatch.on('error', function (err) {
        console.error(err.stack);
    });

    return router.get(routePath, function(req, res, next) {
        var variations = (req.params.variations||'').split(',').concat(base);
        var bundle = req.params.bundle;

        var bundleConfig = config.bundles[bundle];
        var dirs = resolveVariations(existingVariations, variations);

        if (!dirs.length || !bundleConfig) {
            return next();
        }

        // return res.end(JSON.stringify({
        //     bundle:bundle,
        //     variations:variations,
        //     bundleConfig:bundleConfig,
        //     dirs:dirs,
        //     existingVariations:existingVariations,
        //     config:config
        // }, null, '  '));

        res.header('content-type', 'application/javascript');

        bundleConfig = xtend(bundleConfig, {
            base: base,
            basedir: config.basedir,
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
    });
}

function resolveVariations(existingVariations, variations) {
    var i, j, evar, dir, resolved = [];
    // walk in reverse and fill in reverse achieves desired order
    for (i = existingVariations.length-1; i >= 0; i--) {
        evar = existingVariations[i];
        if (-1 !== variations.indexOf(evar.id)) {
            for (j = evar.chain.length-1; j >= 0; j--) {
                dir = evar.chain[j];
                if (-1 === resolved.indexOf(dir)) {
                    resolved.unshift(dir);
                }
            }
        }
    }
    return resolved;
}

var streamCache = {};
function cachedStreamBundle(bundleConfig, dirs) {
    var id = [bundleConfig.id].concat(dirs).join('/');
    if (!streamCache[id]) {
        streamCache[id] = new StreamCache();
        getCachedWatchfy(id, bundleConfig, dirs, function(err, bundler) {
            function bundleError(e) {
                streamCache[id].emit('error', e);
                delete streamCache[id];
            }
            if (err) return bundleError(err);
            var bundle = bundler.bundle();
            bundle.on('error', bundleError);
            bundle.pipe(streamCache[id]);
        });
    }

    return streamCache[id];
}

var watchfyCache = {};
function getCachedWatchfy(id, bundleConfig, dirs, cb) {
    if (watchfyCache[id]) {
        return cb(null, watchfyCache[id]);
    }

    // TODO: async lookup of entries
    bundleConfig.entries = bundleConfig.entries.map(function(entry) {
        return path.join(bundleConfig.base, entry);
    });

    var bundler = browserify(bundleConfig);
    bundler.transform(treenherit, { dirs: dirs });
    bundler.plugin(watchify);

    bundler.on('update', function() {
        streamCache[id] = null;
    });

    watchfyCache[id] = bundler;
    cb(null, watchfyCache[id]);
}

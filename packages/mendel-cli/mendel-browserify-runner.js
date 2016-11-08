/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var xtend = require('xtend');
var async = require('async');
var debug = require('debug')('mendel-runner');

var parseConfig = require('mendel-config');
var postProcessManifests = require('./post-process-manifest');
var mendelBundle = require('./mendel-browserify-bundle');

module.exports = function(rawConfig, options) {
    if (options.config !== false) {
        rawConfig = parseConfig(rawConfig);
    }

    var outdir = rawConfig.bundlesoutdir || rawConfig.outdir;
    mkdirp.sync(outdir);

    var mendelConfig = ['basedir','outdir','bundlesoutdir','serveroutdir',
        'base','basetree','variationsroute','hashroute',
        'variationsdir','variations', 'manifestProcessors']
        .reduce(function(cfg, key) {
            cfg[key] = rawConfig[key];
            return cfg;
        }, {
            config: false,
        });

    debug('parsed config', logObj(mendelConfig));

    var bundles = rawConfig.bundles;

    var configFiltered = bundles.some(function(b) {return !!b.only;});
    if (configFiltered) {
        bundles = bundles.filter(function(b) {
            return !!b.only;
        });
    }

    if (options.only) {
        bundles = bundles.filter(function(b) {
            return options.only.indexOf(b.bundleName) !== -1;
        });
    }

    if (Array.isArray(options.variations)) {
        var old = mendelConfig.variations;
        mendelConfig.variations = {};
        options.variations.forEach(function(id) {
            mendelConfig.variations[id] = old[id];
        });
    }

    bundles.forEach(function(bundle) {
        bundle.entries = normalizeEntries(rawConfig, bundle.entries);
    });

    async.each(
        bundles,
        runMendelBundle.bind(null, mendelConfig),
        function() {
            if (bundles === rawConfig.bundles) {
                runManifestProcessors(rawConfig, done);
            } else {
                done();
            }
            function done() {
                debug('done');
            }
        }
    );
};


function runMendelBundle(mendelConfig, rawBundle, doneBundle) {
    var bundleConfig = JSON.parse(JSON.stringify(rawBundle));
    bundleConfig = xtend({
        basedir: mendelConfig.basedir,
        outfile: path.join(
            mendelConfig.bundlesoutdir, mendelConfig.base, bundleConfig.bundleName + '.js'
        )
    }, bundleConfig);

    mkdirp.sync(path.dirname(bundleConfig.outfile));

    mendelBundle(mendelConfig, bundleConfig, function() {
        debug('done ' + bundleConfig.bundleName);
        doneBundle();
    });
}

function runManifestProcessors(rawConfig, callback) {
    if (Array.isArray(rawConfig.manifestProcessors)) {
        postProcessManifests(rawConfig, function(err) {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            callback();
        });
    }
}

function normalizeEntries(rawConfig, entries) {
    return [].concat(entries).filter(Boolean)
    .map(function(entry) {
        if (typeof entry === 'string') {
            if(!fs.existsSync(path.join(rawConfig.basedir, entry))) {
                var messages = [
                    '[warn] paths relative to variation are deprecated',
                    'you can fix this by changing',
                    entry,
                    'in your configuration'
                ];
                console.log(messages.join(' '));
                entry = path.join(rawConfig.basedir, rawConfig.basetree, entry);
            }
        }
        return entry;
    });
}

function logObj(obj) {
  return require('util').inspect(obj, false, null, true);
}

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var browserify = require('browserify');
var devnull = require('./lib/dev-null');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs-extra');
var inherits = require('util').inherits;
var mendelify = require('./lib/mendelify-plugin');
var Module = require('module');
var parseConfig = require('./lib/config');
var path = require('path');
var requirify = require('mendel-requirify');
var treenherit = require('mendel-treenherit');
var util = require('util');
var validVariations = require('./lib/variations');
var variationMatches = require('./lib/variation-matches');
var watch = require('watch');
var watchify = require('watchify');
var xtend = require('xtend');

var watching = {};

function Swatch(opts) {
    var self = this;

    if (!(self instanceof Swatch)) {
        return new Swatch(opts);
    }

    EventEmitter.call(self);

    var config = parseConfig(opts);
    self.config = xtend(config, {
        verbose: false,
        silent: false
    }, opts.development);

    // This will go away when we fix config
    var base = config.base || 'base';

    self.variations = validVariations(config).concat({
        id: base,
        chain: [config.basetree || 'base']
    });

    self.bundlers = {};
    self.buildPathCache = {};

    // Default 'error' listener
    // https://nodejs.org/docs/v0.12.9/api/events.html#events_class_events_eventemitter
    self.on('error', function(err) {
        if (self.config.silent !== true) {
            console.error(err.stack);
        }
    });
}

inherits(Swatch, EventEmitter);

Swatch.prototype._getBuildPath = function(srcFile) {
    var outdir = this.config.outdir;
    var destFile = this.buildPathCache[srcFile];

    if (!destFile) {
        var match = variationMatches(this.variations, srcFile);
        destFile = path.join(outdir, match.dir, match.file);
        this.buildPathCache[srcFile] = destFile;
    }
    return destFile;
}

Swatch.prototype._uncacheModule = function(destFile) {
    delete Module._cache[destFile];
};

Swatch.prototype._handleDepsChange = function(bundle, variation, srcFiles) {
    var self = this;
    var changes = {
        bundle: bundle,
        variation: variation,
        files: []
    };

    srcFiles.forEach(function (src) {
        var dest = self._getBuildPath(src);
        self._uncacheModule(dest);
        changes.files.push({src: src, dest: dest});
    });

    self.emit('changed', changes);
    self._log('Changed:\n' + util.inspect(changes));
};

Swatch.prototype._handleFileRemoved = function(srcFile) {
    var self = this;
    var destFile = self._getBuildPath(srcFile);

    self._uncacheModule(destFile);
    fs.remove(destFile, function(err) {
        if (err) {
            // error handlers get: error, [bundleId], [srcFile], [destFile]
            return self.emit('error', err, null, srcFile, destFile);
        }
        self.emit('removed', srcFile, destFile);
        self._log('Removed: ' + srcFile);
    });
};

Swatch.prototype._log = function(msg) {
    if (this.config.verbose) {
        console.log(msg);
    }
}

Swatch.prototype.watch = function() {
    var self = this;
    var config = self.config;
    var variations = self.variations;
    var base = config.base;
    var basedir = config.basedir;
    var outdir = config.outdir;

    if (watching[basedir]) {
        console.warn('Already watching: ' + basedir);
        return;
    }

    watch.createMonitor(basedir, {
        ignoreDotFiles: true,
        interval: 500
    }, function(monitor) {
        self.monitor = monitor;
        monitor.on("removed", self._handleFileRemoved.bind(self));

        watching[basedir] = true;
        self.emit('ready', basedir);
        self._log('Watching: ' + basedir);
    });

    Object.keys(config.bundles).forEach(function(bundleId) {
        if (!config.bundles[bundleId].entries) {
            return;
        }

        variations.forEach(function(variation) {
            var variationId = variation.id;
            var bundleConfig = xtend({}, config.bundles[bundleId], {
                base: base,
                basedir: config.basedir,
                cache: {},
                packageCache: {}
            });

            bundleConfig.entries = bundleConfig.entries.map(function(entry) {
                return path.join(bundleConfig.base, entry);
            });

            function bundleError(err) {
                // error handlers get: error, [bundleId], [srcFile], [destFile]
                self.emit('error', err, bundleId, null, null);
            }

            function makeBundle(bundler) {
                var b = bundler.bundle();
                b.on('error', bundleError);
                b.on('transform', function (tr) {
                    tr.on('error', bundleError);
                });
                b.pipe(devnull());
            }

            var bundler = browserify(bundleConfig);
            bundler.transform(treenherit, { dirs: variation.chain });
            bundler.plugin(watchify);
            bundler.plugin(mendelify, {
                variations: [variation]
            });
            bundler.plugin(requirify, {
                outdir: outdir
            });
            bundler.on('update', function(srcFiles) {
                self._handleDepsChange(bundleId, variationId, srcFiles);
                makeBundle(bundler);
            })

            var bundlerKey = bundleId + ':' + variationId;
            self.bundlers[bundlerKey] = bundler;

            makeBundle(bundler);
        });
    });

    return self;
}

Swatch.prototype.stop = function() {
    var self = this;
    var basedir = self.config.basedir;

    if (self.monitor) {
        self.monitor.stop();
        delete watching[basedir];
    }

    Object.keys(self.bundlers).forEach(function(bundlerKey) {
        self.bundlers[bundlerKey].close();
    });
}

module.exports = Swatch;

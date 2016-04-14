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

    self.baseDir = opts.basedir;
    self.outDir = opts.outdir;
    self.verbose = opts.verbose === true;

    var config = parseConfig(opts);
    self.config = config;

    var base = config.base || 'base';

    self.variations = validVariations(config).concat({
        id: base,
        chain: [config.basetree || 'base']
    });

    self.bundlers = {};
    self.buildPathCache = {};
}

inherits(Swatch, EventEmitter);

Swatch.prototype._getBuildPath = function(srcFile) {
    var destFile = this.buildPathCache[srcFile];
    if (!destFile) {
        var match = variationMatches(this.variations, srcFile);
        destFile = path.join(this.outDir, match.dir, match.file);
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

    if (self.verbose) {
        console.log('Changed:\n' + util.inspect(changes));
    }

    self.emit('changed', changes);
};

Swatch.prototype._handleFileCreated = function(srcFile) {
    var self = this;

    if (self.verbose) {
        console.log('Created: ' + srcFile);
    }

    //TODO: do we need to do anything here?
    // Yes! we need in all cases to update the manifest
};

Swatch.prototype._handleFileRemoved = function(srcFile) {
    var self = this;

    if (self.verbose) {
        console.log('Removed: ' + srcFile);
    }

    var destFile = self._getBuildPath(srcFile);
    self._uncacheModule(destFile);
    fs.remove(destFile, function(err) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('removed', srcFile, destFile)
    });
};

Swatch.prototype.watch = function() {
    var self = this;

    if (watching[self.baseDir]) {
        console.warn('Already watching: ' + self.baseDir);
        return;
    }

    var config = self.config;
    var variations = self.variations;
    var base = config.base;
    var outdir = self.outDir;

    watch.createMonitor(self.baseDir, {
        ignoreDotFiles: true,
        interval: 500
    }, function(monitor) {
        self.monitor = monitor;
        monitor.on("created", self._handleFileCreated.bind(self));
        monitor.on("removed", self._handleFileRemoved.bind(self));

        watching[self.baseDir] = true;
        self.emit('ready', self.baseDir);

        if (self.verbose) {
            console.log('Watching: ' + self.baseDir);
        }
    });

    Object.keys(config.bundles).forEach(function(bundleId) {
        if (!config.bundles[bundleId].entries) {
            return;
        }

        self.bundlers[bundleId] = {};

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
                self.emit('error', err);
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

            self.bundlers[bundleId][variationId] = bundler;

            makeBundle(bundler);
        });
    });

    return self;
}

Swatch.prototype.stop = function() {
    if (this.monitor) {
        this.monitor.stop();
        delete watching[this.baseDir];
    }
}

module.exports = Swatch;

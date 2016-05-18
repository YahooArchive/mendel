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
    var devOpts = opts && opts.development || {};

    self.config = xtend(config, {
        verbose: false,
        silent: false
    }, devOpts);

    var base = config.base || 'base';

    self.variations = validVariations(config).concat({
        id: base,
        chain: [config.basetree || 'base']
    });

    self.bundlers = {};
    self.buildPathCache = {};
    self.monitors = [];

    // Default 'error' listener
    // https://nodejs.org/docs/v0.12.9/api/events.html#events_class_events_eventemitter
    self.on('error', function(err, context) {
        if (self.config.silent !== true) {
            console.error('Error context: ' + JSON.stringify(context, null, 2) + '\n' + err.stack);
        }
    });
}

inherits(Swatch, EventEmitter);

Swatch.prototype._getBuildPath = function(srcFile) {
    var outdir = this.config.serveroutdir;
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
    self._log(formatChanges(changes));
};

Swatch.prototype._handleFileRemoved = function(srcFile) {
    var self = this;
    var destFile = self._getBuildPath(srcFile);

    self._uncacheModule(destFile);
    fs.remove(destFile, function(err) {
        if (err) {
            return self.emit('error', err, {
                src: srcFile,
                dest: destFile
            });
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
    var basedir = config.basedir;
    var outdir = config.serveroutdir;

    if (watching[basedir]) {
        console.warn('Already watching: ' + basedir);
        return;
    }

    watching[basedir] = true;

    function fileIsInOutdir(file) {
        return file.indexOf(outdir) === 0;
    }

    // watch only valid variations dirs
    var watchDirs = flattenDirs(basedir, variations);
    var pending = watchDirs.length;

    watchDirs.forEach(function(dir) {
        (function(wdir) {
            watching[wdir] = true;

            watch.createMonitor(wdir, {
                ignoreDotFiles: true,
                interval: 500,
                filter: fileIsInOutdir
            }, function(monitor) {
                self.monitors.push({
                    dir: wdir,
                    monitor: monitor
                });
                /*
                 * File deletions are handled by the watch monitor.
                 * They are removed from require cache and file system.
                 */
                monitor.on("removed", self._handleFileRemoved.bind(self));

                pending--;
                if (!pending) {
                    self.emit('ready', basedir);
                    self._log('Watching: ' + basedir);
                }
            });
        })(dir);
    });

    config.bundles.forEach(function(bundle) {
        if (!bundle.entries) {
            return;
        }

        var bundleId = bundle.id;

        variations.forEach(function(variation) {
            var variationId = variation.id;
            var bundleConfig = xtend({}, config, bundle, {
                cache: {},
                packageCache: {}
            });

            bundleConfig.entries = bundleConfig.entries.map(function(entry) {
                return path.join(bundleConfig.basetree, entry);
            });

            function bundleError(err) {
                self.emit('error', err, {
                    bundle: bundleId,
                    variation: variationId
                });
            }

            function makeBundle(bundler) {
                var b = bundler.bundle();
                b.on('error', bundleError);
                b.on('transform', function (tr) {
                    tr.on('error', bundleError);
                });
                b.pipe(devnull());
            }

            /*
             * We use a watchified browserify pipeline for writing the individual server side
             * transformed files (through mendel-requirify plugin), because .mendelrc is
             * a valid browserify config file, which may include multiple transforms or plugins
             * that we need to honor while generating the server side output.
             */
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
                /*
                 * When watchify emits file change, we remove it from the require cache
                 * and let the pipeline rebuild it
                 */
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

    self.monitors.forEach(function(entry) {
        entry.monitor.stop();
        delete watching[entry.dir];
    });

    delete watching[basedir];

    Object.keys(self.bundlers).forEach(function(bundlerKey) {
        self.bundlers[bundlerKey].close();
    });
}

module.exports = Swatch;


function formatChanges(changes) {
    var files = changes.files.map(function (file) {
        return [
            '    - src:  ' + file.src,
            '      dest: ' + file.dest
        ].join('\n');
    });
    var header = [
        'Changed:',
        '  bundle: ' + changes.bundle,
        '  variation: ' + changes.variation,
        '  files:'
    ];

    return header.concat(files).join('\n');
}

function flattenDirs(basedir, variations) {
    // dedupe
    var dirsMap = variations.reduce(function(dirs, variation) {
        variation.chain.forEach(function(dir) {
            dirs[dir] = true;
        });
        return dirs;
    }, {});
    // join full path
    var dirs = Object.keys(dirsMap).map(function(dir) {
        return path.join(basedir, dir);
    });

    return dirs;
}

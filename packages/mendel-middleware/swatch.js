var fs = require('fs-extra');
var path = require('path');
var watch = require('watch');
var Module = require('module');
var through = require('through2');
var falafel = require('falafel');
var babelify = require('babelify');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var variationMatches = require('./lib/variation-matches');
var isRequire = require('./lib/falafel-util').isRequire;
var resolve = require('browser-resolve');
var mendelRequireTransform = require('./lib/require-transform');

var watching = {};

function Swatch(opts) {
    if (!(this instanceof Swatch)) {
        return new Swatch(opts);
    }

    EventEmitter.call(this);

    var self = this;
    self.baseDir = opts.basedir;

    if (watching[self.baseDir]) {
        console.log('Already watching: ' + self.baseDir);
        return;
    }

    self.outDir = opts.outdir;
    self.variations = opts.variations;

    watch.createMonitor(self.baseDir, {
        ignoreDotFiles: true,
        interval: 500
    }, function(monitor) {
        monitor.on("created", self.onFileCreated.bind(self));
        monitor.on("changed", self.onFileChanged.bind(self));
        monitor.on("removed", self.onFileRemoved.bind(self));

        watching[self.baseDir] = true;
        console.log('Watching ' + self.baseDir);
    });    
}

inherits(Swatch, EventEmitter);

Swatch.prototype._getBuildPath = function(match) {
    var destFile = path.join(this.outDir, match.dir, match.file);
    return destFile;
}

Swatch.prototype._processFile = function(file, cb) {
    var start = process.hrtime();
    var self = this;
    var match = variationMatches(self.variations, file);
    var destFile = self._getBuildPath(match);

    var out = fs.createOutputStream(destFile);
    out.on('finish', function() {
        var diff = process.hrtime(start);
        var elapsedMs = Math.floor((diff[0] * 1e3) + (diff[1] * 1e-6));
        console.log('Wrote: ' + destFile + ' in ' + elapsedMs + 'ms');
        cb(null, elapsedMs);
    });
    out.on('error', cb);

    var stream = fs.createReadStream(file)
        .pipe(babelify(file, {
            "presets": ["es2015", "react"],
            "retainLines": true
        }))
        .pipe(through(function(chunk, enc, next) {
            this.push(self._replaceRequiresOnSource(chunk, match));
            next();
        }))
        .pipe(through(function(chunk, enc, next) {
            this.push(mendelRequireTransform(chunk, true));
            next();
        }))
        .pipe(out);

    stream.on('error', cb);
};

Swatch.prototype._removeFile = function(file, cb) {
    var match = variationMatches(this.variations, file);
    var destFile = this._getBuildPath(match);
    fs.remove(destFile, cb);
}

Swatch.prototype._uncache = function(file) {
    delete Module._cache[file];
};

Swatch.prototype._replaceRequiresOnSource = function(src, match) {
    var baseDir = this.baseDir;
    var variations = this.variations;
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true
    };
    var file = match.file;
    var dirs = match.variation.chain;

    return falafel(src, opts, function (node) {
        if (isRequire(node)) {
            var value = node.arguments[0].value;
            var resolvedPath = null;

            dirs.some(function(dir) {
                var srcPath = path.join(baseDir, dir, file);

                try {
                    resolvedPath = resolve.sync(value, {filename: srcPath});
                } finally {
                    return resolvedPath !== null;
                }
            });

            if (resolvedPath) {
                var dep = variationMatches(variations, resolvedPath);

                if (dep) {
                    node.update('require(\'' + dep.file + '\')');
                }
            }
        }
    }).toString();
};

Swatch.prototype.onFileChanged = function(file) {
    console.log('Changed: ' + file);
    var self = this;
    self._uncache(file);
    self._processFile(file, function (err, elapsedMs) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('changed', file, elapsedMs);
    });
};

Swatch.prototype.onFileCreated = function(file) {
    console.log('Created: ' + file);
    var self = this;
    self._processFile(file, function (err, elapsedMs) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('created', file, elapsedMs);
    });
};

Swatch.prototype.onFileRemoved = function(file) {
    console.log('Removed: ' + file);
    var self = this;
    self._uncache(file);
    self._removeFile(file, function(err) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('removed', file);
    });
};

module.exports = Swatch;

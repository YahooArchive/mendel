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

Swatch.prototype._getBuildPath = function(srcFile, match) {
    match = match || variationMatches(this.variations, srcFile);
    var destFile = path.join(this.outDir, match.dir, match.file);
    return destFile;
}

Swatch.prototype._processFile = function(srcFile, cb) {
    var start = process.hrtime();
    var self = this;
    var match = variationMatches(self.variations, srcFile);
    var destFile = self._getBuildPath(srcFile, match);

    var out = fs.createOutputStream(destFile);
    out.on('finish', function() {
        var diff = process.hrtime(start);
        var elapsedMs = Math.floor((diff[0] * 1e3) + (diff[1] * 1e-6));
        console.log('Wrote: ' + destFile + ' in ' + elapsedMs + 'ms');
        cb(null, destFile, elapsedMs);
    });
    out.on('error', cb);

    var stream = fs.createReadStream(srcFile)
        .pipe(babelify(srcFile, {
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

Swatch.prototype._uncache = function(destFile) {
    delete Module._cache[destFile];
};

Swatch.prototype._replaceRequiresOnSource = function(src, match) {
    var baseDir = this.baseDir;
    var variations = this.variations;
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true
    };
    var srcFile = match.file;
    var dirs = match.variation.chain;

    return falafel(src, opts, function (node) {
        if (isRequire(node)) {
            var value = node.arguments[0].value;
            var resolvedPath = null;

            dirs.some(function(dir) {
                var srcPath = path.join(baseDir, dir, srcFile);

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

Swatch.prototype.onFileChanged = function(srcFile) {
    console.log('Changed: ' + srcFile);
    var self = this;
    var destFile = self._getBuildPath(srcFile);
    self._uncache(destFile);
    self._processFile(srcFile, function (err, newFile, elapsedMs) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('changed', srcFile, newFile, elapsedMs);
    });
};

Swatch.prototype.onFileCreated = function(srcFile) {
    console.log('Created: ' + srcFile);
    var self = this;
    self._processFile(srcFile, function (err, newFile, elapsedMs) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('created', srcFile, newFile, elapsedMs);
    });
};

Swatch.prototype.onFileRemoved = function(srcFile) {
    console.log('Removed: ' + srcFile);
    var self = this;
    var destFile = self._getBuildPath(srcFile);
    self._uncache(destFile);
    fs.remove(destFile, function(err) {
        if (err) {
            return self.emit('error', err);
        }
        self.emit('removed', srcFile, destFile);
    });
};

module.exports = Swatch;

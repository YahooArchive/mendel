
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');
var through = require('through2');
var bresolve = require('browser-resolve');
var transformTools = require('browserify-transform-tools');

module.exports = mendelExtractBundles;

function mendelExtractBundles(referenceBundle, opts) {
    var browserify = referenceBundle.constructor;
    var pipeline = referenceBundle.pipeline.constructor;
    var bopts = referenceBundle._options;

    referenceBundle._transformOrder += 50;
    referenceBundle.transform(absoluteRequires);
    referenceBundle._transformOrder -= 50;

    var allFiltered = [];
    var allIncluded = [];
    var extractions = opts.extractions||{};

    delete extractions._;
    extractions = Object.keys(extractions)
    .filter(Boolean).map(function(extraction) {
        var entries = opts.extractions[extraction];
        if (entries._) entries = entries._;
        allFiltered = allFiltered.concat(entries);
        return {
            id: extraction,
            entries: entries,
        }
    });

    bopts.filter = function(id) {
        for (var i = 0; i < allFiltered.length; i++) {
            if (id.indexOf(allFiltered[i]) === id.length - allFiltered[i].length) {
                return false;
            }
        }
        allIncluded.push(id);
        return true;
    };

    extractions.forEach(function(extraction) {
        var xbopts = xtend(bopts);

        xbopts.entries = extraction.entries;
        delete xbopts.require;

        xbopts.filter = function(id) {
            if (-1 !== allIncluded.indexOf(id)) {
                return false;
            }
            return true;
        };

        var xb = browserify(xbopts);

        xb._transformOrder += 50;
        xb.transform(absoluteRequires);
        xb._transformOrder -= 50;

        Object.keys(browserify.prototype)
            .filter(onlyPublicMethods)
            .filter(notBundle)
            .forEach(function(method) {
                proxyMethod(method, referenceBundle, xb)
            });

        Object.keys(pipeline.prototype)
            .filter(onlyPublicMethods)
            .forEach(function(method) {
                proxyMethod(method, referenceBundle.pipeline, xb.pipeline)
            });

        referenceBundle.on('bundle', function() {
            if (referenceBundle.argv.list && !referenceBundle._logbase) {
                console.log('original bundle');
                referenceBundle._logbase = true;
            }
        });

        referenceBundle.pipeline.get('wrap').once('end', function() {
            if (referenceBundle.argv.list) {
                return listBundle(referenceBundle, xb, extraction);
            }

            if (false && referenceBundle.argv.o || referenceBundle.argv.outfile) {
                writeExtraction(referenceBundle, opts, extraction, xb);
            } else {
                return xb.bundle().pipe(process.stdout);
            }
        });
    });
}

function writeExtraction(referenceBundle, opts, extraction, xb) {
    var extractionOut = extractionDest(referenceBundle, opts, extraction);
    return xb.bundle().pipe(fs.createWriteStream(extractionOut));
}

function extractionDest(referenceBundle, opts, extraction) {
    var baseOut = path.parse(referenceBundle.argv.o || referenceBundle.argv.outfile);
    return path.join(
        baseOut.dir,
        extraction.id+'.'+baseOut.ext
    );
}

function listBundle(referenceBundle, xb, extraction) {
    xb._log = [];
    xb.pipeline.get('deps').push(through.obj(
        function (row, enc, next) {
            xb._log.push(row.file || row.id);
            next();
        }
    ));
    xb.bundle(function() {
        console.log(extraction.id);
        xb._log.forEach(function(l){console.log(l)});
    });
}


var absoluteRequires = transformTools.makeRequireTransform(
    "absoluteRequires",
    {evaluateArguments: true},
    function(args, opts, transformDone) {
        var parent = opts.file;
        var module = args[0];

        if (isExternalModule(module)) {
            return transformDone();
        }
        bresolve(module, {filename: parent}, function(err, finalPath) {
            finalPath = path.resolve(finalPath);
            transformDone(null, "require('"+finalPath+"')");
        });
    }
);

function proxyMethod(method, source, destination) {
    var oldMethod = source[method];
    source[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        destination[method].apply(destination, args);
        return oldMethod.apply(source, args);
    }
}

function notBundle(method) {
    return method !== 'bundle';
}

function onlyPublicMethods(method) {
    return method.indexOf('_') !== 0;
}

function isExternalModule (file) {
    var regexp = process.platform === 'win32' ?
        /^(\.|\w:)/ :
        /^[\/.]/;
    return !regexp.test(file);
}

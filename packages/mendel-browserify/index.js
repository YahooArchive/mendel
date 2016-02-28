
var xtend = require('xtend');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var through = require('through2');

var validVariations = require('./lib/variations');

module.exports = mendelBrowserify;

function mendelBrowserify(baseBundle, opts) {
    var browserify = baseBundle.constructor;
    var bopts = baseBundle._options;
    var variations = validVariations(opts);

    variations.forEach(function(variation) {
        var vopts = xtend(bopts);
        var bv = browserify(vopts);

        Object.keys(browserify.prototype)
            .filter(onlyPublicMethods)
            .forEach(function(method) {
                var to = bv;
                if (method === 'bundle') to = { bundle: onBaseBundleStart };

                proxyMethod(method, baseBundle, to)
            });

        function onBaseBundleStart() {
            var topts = {"dirs": variation.chain};

            bv.transform(path.join(__dirname, "../mendel-treenherit"), topts);

            if (baseBundle.argv.list) {
                return listBundle(baseBundle, bv, variation);
            }

            if (baseBundle.argv.o || baseBundle.argv.outfile) {
                writeVariation(baseBundle, opts, variation, bv);
            } else {
                return bv.bundle().pipe(process.stdout);
            }
        }
    });
}

function writeVariation(baseBundle, opts, variation, bv) {
    var baseOut = baseBundle.argv.o || baseBundle.argv.outfile;

    var variationOut = path.join(
        path.dirname(baseOut),
        variation.id+'.'+path.basename(baseOut)
    );

    if (opts.outdir) {
        variationOut = path.join(
            opts.outdir,
            variation.id,
            path.basename(baseOut)
        );
    }

    mkdirp.sync(path.dirname(baseOut));
    mkdirp.sync(path.dirname(variationOut));

    return bv.bundle().pipe(fs.createWriteStream(variationOut));
}

function listBundle(baseBundle, bv, variation) {
    if (!baseBundle._logbase) {
        console.log('base');
        baseBundle._logbase = true;
    }
    bv._log = [];
    bv.pipeline.get('deps').push(through.obj(
        function (row, enc, next) {
            bv._log.push(row.file || row.id);
            next();
        }
    ));
    bv.bundle(function() {
        console.log(variation.id);
        bv._log.forEach(function(l){console.log(l)});
    });
}

function proxyMethod(method, source, destination) {
    var oldMethod = source[method];
    source[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        destination[method].apply(destination, args);
        return oldMethod.apply(source, args);
    }
}

function onlyPublicMethods(method) {
    return method.indexOf('_') !== 0;
}

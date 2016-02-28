
var xtend = require('xtend');
var path = require('path');
var through = require('through2');

var validVariations = require('./lib/variations');

module.exports = mendelBrowserify;

function mendelBrowserify(baseBundle, opts) {
    var browserify = baseBundle.constructor;
    var bopts = baseBundle._options;
    var variations = validVariations(opts);
    logObj(variations);

    variations.forEach(function(variation) {
        var vopts = xtend(bopts);
        var bv = browserify(vopts);

        ['transform', 'plugin', 'ignore', 'exclude', 'require', 'external']
            .forEach(function(method) {
                proxyMethod(method, baseBundle, bv) });

        proxyMethod('bundle', baseBundle, { bundle: onBaseBundleStart });

        function onBaseBundleStart() {
            var opts = {"dirs": variation.chain};

            bv.transform(path.join(__dirname, "../mendel-treenherit"), opts);

            if (baseBundle.argv.list) {
                return listBundle(baseBundle, bv, variation);
            }
        }
    });
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

function logObj(obj) {
    console.log(require('util').inspect(obj,false,null,true));
    return obj;
}

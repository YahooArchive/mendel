
var xtend = require('xtend');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var through = require('through2');
var shasum = require('shasum');
var JSONStream = require('JSONStream');

var validVariations = require('./lib/variations');
var variationMatches = require('./lib/variation-matches');

module.exports = mendelBrowserify;

function mendelBrowserify(baseBundle, opts) {
    var browserify = baseBundle.constructor;
    var pipeline = baseBundle.pipeline.constructor;
    var bopts = baseBundle._options;
    var variations = validVariations(opts);
    var baseVariation = {
        id: 'base',
        chain: [opts.basetree],
    };
    var variationsWithBase = [baseVariation].concat(variations);

    if (baseBundle.argv.deps) {
        console.log(
            "--deps not supported. \n",
            "use --manifest in mendel-browserify options instead."
        );
        return process.exit(1);
    }

    if (opts.manifest) {
        createManifest(
            baseBundle, baseBundle, opts, variationsWithBase, baseVariation
        );
    }

    if (baseBundle.argv.o || baseBundle.argv.outfile) {
        mkdirp.sync(path.dirname(baseBundle.argv.o || baseBundle.argv.outfile));
    }

    variations.forEach(function(variation) {
        var vopts = xtend(bopts);
        var bv = browserify(vopts);

        Object.keys(browserify.prototype)
            .filter(onlyPublicMethods)
            .filter(notBundle)
            .forEach(function(method) {
                proxyMethod(method, baseBundle, bv)
            });

        Object.keys(pipeline.prototype)
            .filter(onlyPublicMethods)
            .forEach(function(method) {
                proxyMethod(method, baseBundle.pipeline, bv.pipeline)
            });

        baseBundle.on('bundle', function onBaseBundleStart() {
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

            if (opts.manifest) {
                createManifest(
                    bv, baseBundle, opts, variationsWithBase, variation
                );
            }
        });
    });
    // Any action on baseBundle after the proxies, will also affect variations.

    if (bopts.debug) {
        addPipelineDebug(baseBundle, [opts.basetree, opts.variationsdir]);
    }
}

function createManifest(currentBundle, baseBundle, opts, variations, variation) {
    var depsStream = createDepsStream(baseBundle, opts, variation);
    currentBundle.on('bundle', function(b) { b.on('end', depsStream.end); });

    function mendelify(row, enc, next) {
      var match = variationMatches(variations, row.file);
      if (match) {
        row.id = match.file;
        row.variation = match.dir;
      }

      Object.keys(row.deps).forEach(function (key) {
        var depMatch = variationMatches(variations, key);
        if (depMatch) {
          row.deps[depMatch.file] = depMatch.file;
          delete row.deps[key];
        }
      });

      // row.source = replaceRequiresOnSource(row.source, row);

      row.sha = shasum(row.source);

      // pushBundleManifest(row);

      this.push(row);
      depsStream.write(row);
      next();
    }
    currentBundle.pipeline.get('deps').push(through.obj(mendelify));
}

function createDepsStream(baseBundle, opts, variation) {
    var variationOut = variationDest(baseBundle, opts, variation);
    var name = path.parse(variationOut).name;

    var destDir = path.dirname(variationOut);
    var destDeps = path.join(destDir, name+'.manifest.json');
    mkdirp.sync(destDir);

    var depsStream = JSONStream.stringify();
    depsStream.pipe(fs.createWriteStream(destDeps));

    return depsStream;
}

function addPipelineDebug(b, dirs) {
    var debug = through.obj(function (row, enc, next) {
        var look = new RegExp("/("+dirs.join('|')+"|node_modules)/");
        var parts = row.file.split(look);
        row.sourceFile = parts.splice(-2).join('/');
        row.sourceRoot = parts.join('/');
        this.push(row);
        next();
    });
    b.pipeline.get("debug").splice(0, 1, debug);
}

function writeVariation(baseBundle, opts, variation, bv) {
    var variationOut = variationDest(baseBundle, opts, variation);

    mkdirp.sync(path.dirname(variationOut));

    return bv.bundle().pipe(fs.createWriteStream(variationOut));
}

function variationDest(baseBundle, opts, variation) {
    var baseOut = path.parse(baseBundle.argv.o || baseBundle.argv.outfile);
    var variationOut = path.join(
        baseOut.dir,
        variation.id+'.'+baseOut.base
    );

    if (opts.outdir) {
        variationOut = path.join(
            opts.outdir,
            variation.id,
            baseOut.base
        );
    }

    return variationOut;
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

function notBundle(method) {
    return method !== 'bundle';
}

function onlyPublicMethods(method) {
    return method.indexOf('_') !== 0;
}

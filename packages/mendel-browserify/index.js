
var xtend = require('xtend');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var through = require('through2');
var shasum = require('shasum');
var JSONStream = require('JSONStream');
var falafel = require('falafel');
var isRequire = require('./lib/falafel-util').isRequire;
var validVariations = require('./lib/variations');
var variationMatches = require('./lib/variation-matches');
var proxy = require('./lib/proxy');
var onlyPublicMethods = proxy.onlyPublicMethods;

module.exports = mendelBrowserify;

function mendelBrowserify(baseBundle, opts) {
    var browserify = baseBundle.constructor;
    var bopts = baseBundle._options;
    var variations = validVariations(xtend(bopts, opts));
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

    addTransform(baseBundle, baseVariation.chain);

    if (opts.manifest) {
        baseBundle.__mendelManifestPending = 0;
        baseBundle.__mendelManifest = {
            bundleIndexes: {},
            bundles: [],
        };

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

        proxy(browserify, baseBundle, bv, {
            filters: [onlyPublicMethods],
            exclude: ['bundle']
        });

        proxy(browserify, baseBundle.pipeline, bv.pipeline, {
            filters: [onlyPublicMethods]
        });

        addTransform(bv, variation.chain);

        baseBundle.on('bundle', function onBaseBundleStart() {
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

function createManifest(bundle, baseBundle, opts, variations, variation) {
    var depsStream = createDepsStream(baseBundle, opts, variation);

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

        row.source = replaceRequiresOnSource(row.source, variations);
        row.sha = shasum(row.source);
        pushBundleManifest(baseBundle, row);

        this.push(row);
        depsStream.write(row);
        next();
    }
    bundle.pipeline.get('deps').push(through.obj(mendelify));
    ++ baseBundle.__mendelManifestPending;
    bundle.on('bundle', function(b) { b.on('end', function() {
        depsStream.end();
        if (-- baseBundle.__mendelManifestPending === 0) {
            doneManifest(baseBundle, opts);
        }
    })});
}

function pushBundleManifest(baseBundle, dep) {
    var id = dep.id;
    var variation = dep.variation || 'module';
    var data = JSON.parse(JSON.stringify(dep));

    delete data.file;
    delete data.source;
    delete data.id;

    var bundleManifest = baseBundle.__mendelManifest;
    var bundleIndexes = bundleManifest.bundleIndexes;
    var bundleData = bundleManifest.bundles;

    Object.keys(data.deps).forEach(function(key) {
        var index = bundleIndexes[key];
        if (typeof index !== 'undefined') {
            data.deps[key] = index;
        }
        index = bundleIndexes[data.deps[key]];
        if (typeof index !== 'undefined') {
            data.deps[key] = index;
        }
    });

    if (typeof bundleIndexes[id] === 'undefined') {
        var newDep = {
            id: id,
            variations: [variation],
            data: [data],
        };
        bundleData.push(newDep);
        bundleIndexes[id] = bundleData.indexOf(newDep);
    } else {
        var existingData = bundleData[bundleIndexes[id]];
        var variationIndex = existingData.variations.indexOf(variation);
        if (variationIndex === -1) {
            existingData.variations.push(variation);
            existingData.data.push(data);
        } else if (existingData.data[variationIndex].sha !== dep.sha) {
            throw new Error('Files with same variation ('+
                variation+') and id ('+id+') should have the same SHA');
        }
    }
}

function doneManifest(baseBundle, opts) {
    var bundleManifest = baseBundle.__mendelManifest;
    var baseOut = path.parse(baseBundle.argv.o || baseBundle.argv.outfile);
    var name = baseOut.name;

    var manifestPath = path.join(
        opts.outdir || baseOut.dir,
        name+'.manifest.json'
    );
    fs.writeFile(
        manifestPath, JSON.stringify(bundleManifest, null, 2),
        function (err) {
            if (err) throw err;
        }
    );
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

function replaceRequiresOnSource (src, variations) {
  var opts = {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true
  };
  return falafel(src, opts, function (node) {
    if (isRequire(node)) {
      var value = node.arguments[0].value;
      var match = variationMatches(variations, value);
      if (match) {
        if(match) node.update('require(\'' + match.file + '\')');
      }
    }
  }).toString();
}

function addTransform(bundle, chain) {
    // This is unfortunate, we need to be the last require transform
    // I will pay someone a beer if they find out a better way
    bundle._transformOrder += 50;
    bundle.transform(path.join(__dirname, "../mendel-treenherit"), {
        dirs: chain,
    });
    bundle._transformOrder -= 50;
}

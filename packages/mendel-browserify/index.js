/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

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

module.exports = MendelBrowserify;

function MendelBrowserify(baseBundle, opts) {
    if (!(this instanceof MendelBrowserify)) {
        return new MendelBrowserify(baseBundle, opts);
    }

    var self = this;

    this.opts = opts;
    this.baseBundle = baseBundle;
    this.baseOptions = baseBundle._options;

    if (this.opts.manifest) {
        this._manifestPending = 0;
        this._manifestIndexes = {};
        this._manifestBundles = [];
    }

    this.baseVariation = {
        id: 'base',
        chain: [opts.basetree],
    };
    this.variations = validVariations(xtend(this.baseOptions, opts));
    this.variationsWithBase = [this.baseVariation].concat(this.variations);


    this.prepareBundle(baseBundle, this.baseVariation);


    this.variations.forEach(function(variation) {
        var vopts = xtend(self.baseOptions);
        var browserify = baseBundle.constructor;
        var pipeline = baseBundle.pipeline.constructor;
        var variationBundle = browserify(vopts);

        self.prepareBundle(variationBundle, variation);

        proxy(browserify, baseBundle, variationBundle, {
            filters: [onlyPublicMethods],
            exclude: ['bundle']
        });

        proxy(pipeline, baseBundle.pipeline, variationBundle.pipeline, {
            filters: [onlyPublicMethods]
        });

        baseBundle.on('bundle', function onBaseBundleStart() {
            if (baseBundle.argv.list) {
                return self.listVariation(variationBundle);
            }

            if (baseBundle.outfile) {
                self.writeVariation(variationBundle);
            } else {
                return variationBundle.bundle().pipe(process.stdout);
            }
        });
    });
}

MendelBrowserify.prototype.prepareBundle = function(bundle, variation) {
    bundle.variation = variation;
    addTransform(bundle);

    if (bundle.argv) {
        bundle.outfile = bundle.argv.o || bundle.argv.outfile;
        if (bundle.outfile) mkdirp.sync(path.dirname(bundle.outfile));
        if (bundle.argv.deps) {
            console.log(
                "--deps not supported. \n",
                "use --manifest in mendel-browserify options instead."
            );
            return process.exit(1);
        }
    }

    if (this.baseOptions.debug) {
        this.addPipelineDebug(bundle);
    }

    if (this.opts.manifest) {
        this.createManifest(bundle);
    }
}

MendelBrowserify.prototype.addPipelineDebug = function(bundle) {
    var self = this;
    function mendelDebg(row, enc, next) {
        var dirs = [
            self.opts.basetree,
            self.opts.variationsdir,
            'node_modules'
        ];
        var look = new RegExp("/("+dirs.join('|')+")/");
        var parts = row.file.split(look);
        row.sourceFile = parts.splice(-2).join('/');
        row.sourceRoot = parts.join('/');
        this.push(row);
        next();
    }
    bundle.pipeline.get("debug").splice(0, 1, through.obj(mendelDebg));
}

MendelBrowserify.prototype.createManifest = function(bundle) {
    var self = this;
    var depsStream = this.createDepsStream(bundle);

    function mendelify(row, enc, next) {
        var match = variationMatches(self.variations, row.file);
        if (match) {
            row.id = match.file;
            row.variation = match.dir;
        }

        Object.keys(row.deps).forEach(function (key) {
            var depMatch = variationMatches(self.variations, key);
            if (depMatch) {
                row.deps[depMatch.file] = depMatch.file;
                delete row.deps[key];
            }
        });

        row.source = replaceRequiresOnSource(row.source, self.variations);
        row.sha = shasum(row.source);
        self.pushBundleManifest(row, bundle.variation.id);

        this.push(row);
        depsStream.write(row);
        next();
    }
    bundle.pipeline.get('deps').push(through.obj(mendelify));

    ++ self._manifestPending;
    bundle.on('bundle', function(b) { b.on('end', function() {
        depsStream.end();
        if (-- self._manifestPending === 0) {
            self.doneManifest();
        }
    })});
}

MendelBrowserify.prototype.pushBundleManifest = function(dep) {
    var self = this;
    var id = dep.id;
    var variation = dep.variation || "base";
    var data = JSON.parse(JSON.stringify(dep));
    var bundleIndexes = self._manifestIndexes;
    var allBundles = self._manifestBundles;

    delete data.file;
    delete data.source;
    delete data.id;

    var bundleIndex = bundleIndexes[id];
    if (typeof bundleIndex === 'undefined') {
        var newDep = {
            id: id,
            variations: [variation],
            data: [data],
        };
        allBundles.push(newDep);
        bundleIndexes[id] = allBundles.indexOf(newDep);
    } else {
        var existingData = allBundles[bundleIndex];
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

MendelBrowserify.prototype.doneManifest = function() {
    var bundleManifest = {
        indexes: this._manifestIndexes,
        bundles: this._manifestBundles,
    };

    bundleManifest.bundles.forEach(function(file) {
        file.data.forEach(function(data) {
            Object.keys(data.deps).forEach(function(key) {
                var index = bundleManifest.indexes[key];
                if (typeof index !== 'undefined') {
                    data.deps[key] = index;
                }
                index = bundleManifest.indexes[data.deps[key]];
                if (typeof index !== 'undefined') {
                    data.deps[key] = index;
                }
            });
        })
    });

    var baseOut = {
        dir: false,
        name: false,
    };
    var manifest = xtend(baseOut);
    if (typeof this.opts.manifest === 'string') {
        manifest = path.parse(this.opts.manifest);
    }
    if (typeof this.baseBundle.outfile === 'string') {
        baseOut = path.parse(this.baseBundle.outfile);
    }
    var manifestPath = path.join(
        (manifest.dir||baseOut.dir),
        (baseOut.name||manifest.name)+'.manifest.json'
    );

    fs.writeFile(
        manifestPath, JSON.stringify(bundleManifest, null, 2),
        function (err) {
            if (err) throw err;
        }
    );
}

MendelBrowserify.prototype.createDepsStream = function(bundle) {
    var outFile = bundle.outfile || this.variationDest(bundle);
    var fileParts = path.parse(outFile);
    var destDeps = path.join(fileParts.dir, fileParts.name+'.manifest.json');

    var depsStream = JSONStream.stringify();

    mkdirp.sync(fileParts.dir);
    depsStream.pipe(fs.createWriteStream(destDeps));

    return depsStream;
}

MendelBrowserify.prototype.writeVariation = function(bundle) {
    var variationOut = this.variationDest(bundle);

    mkdirp.sync(path.dirname(variationOut));

    return bundle.bundle().pipe(fs.createWriteStream(variationOut));
}

MendelBrowserify.prototype.variationDest = function(bundle) {
    var variation = bundle.variation.id;
    var baseOut = path.parse(this.baseBundle.outfile);
    var variationOut = path.join(
        baseOut.dir,
        variation+'.'+baseOut.base
    );

    if (this.opts.outdir) {
        variationOut = path.join(
            this.opts.outdir,
            variation,
            baseOut.base
        );
    }

    return variationOut;
}

MendelBrowserify.prototype.listVariation = function(bundle) {
    if (!this._logBase) {
        console.log('base');
        this._logBase = true;
    }

    bundle._log = [bundle.variation.id];
    bundle.pipeline.get('deps').push(through.obj(
        function (row, enc, next) {
            bundle._log.push(row.file || row.id);
            next();
        }
    ));
    bundle.bundle(function() {
        process.stdout.write('\n'+bundle._log.join('\n\t')+'\n');
    });
}

function replaceRequiresOnSource(src, variations) {
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

function addTransform(bundle) {
    // This is unfortunate, we need to be the last require transform
    // I will pay someone a beer if they find out a better way
    bundle._transformOrder += 50;
    bundle.transform(path.join(__dirname, "../mendel-treenherit"), {
        dirs: bundle.variation.chain,
    });
    bundle._transformOrder -= 50;
}

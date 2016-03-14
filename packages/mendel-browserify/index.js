/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var xtend = require('xtend');
var defined = require('defined');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var through = require('through2');
var shasum = require('shasum');
var falafel = require('falafel');
var isRequire = require('./lib/falafel-util').isRequire;
var parseConfig = require('./lib/config');
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
    var argv = baseBundle.argv || {};
    this.baseBundle = baseBundle;
    this.baseOptions = baseBundle._options;

    opts.basedir = defined(
        opts.basedir, argv.basedir, this.baseOptions.basedir
    );
    opts.outfile = defined(
        opts.outfile, argv.outfile, argv.o, this.baseOptions.outfile
    );

    opts = parseConfig(xtend(opts));
    this.opts = opts;

    this._manifestPending = 0;
    this._manifestIndexes = {};
    this._manifestBundles = [];

    this.baseVariation = {
        id: opts.base || 'base',
        chain: [opts.basetree || 'base'],
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
            if (argv.list) {
                return self.listVariation(variationBundle);
            }

            if (self.opts.outfile) {
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

    this.createManifest(bundle);
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
        self.pushBundleManifest(row);

        this.push(row);
        next();
    }
    bundle.pipeline.get('deps').push(through.obj(mendelify));

    ++ self._manifestPending;
    bundle.on('bundle', function(b) { b.on('end', function() {
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

    var bundleIndex = bundleIndexes[id];
    if (typeof bundleIndex === 'undefined') {
        var newDep = {
            variations: [variation],
            data: [data],
        };
        ['id', 'entry', 'expose'].forEach(function(prop) {
            if (typeof data[prop] !== undefined) {
                newDep[prop] = data[prop];
            }
        })
        allBundles.push(newDep);
        newDep.index = allBundles.indexOf(newDep);
        bundleIndexes[id] = newDep.index;
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

    mkdirp.sync(this.opts.outdir);

    var manifest = path.join(this.opts.outdir, this.opts.manifest);
    fs.writeFile(
        manifest, JSON.stringify(bundleManifest, null, 2),
        function (err) {
            if (err) throw err;
        }
    );
}

MendelBrowserify.prototype.writeVariation = function(bundle) {
    var variationOut = this.variationDest(bundle);

    return bundle.bundle().pipe(fs.createWriteStream(variationOut));
}

MendelBrowserify.prototype.variationDest = function(bundle) {
    var variation = bundle.variation.id;
    var filename = path.parse(this.opts.outfile).base;

    var variationOut = path.join(
        this.opts.bundlesoutdir,
        variation,
        filename
    );

    mkdirp.sync(path.dirname(variationOut));

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

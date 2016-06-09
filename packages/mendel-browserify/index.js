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
var parseConfig = require('mendel-config');
var validVariations = require('mendel-config/variations');
var mendelify = require('mendel-development/mendelify-transform-stream');
var proxy = require('./proxy');
var tmp = require('tmp');
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

    if (opts.bundle && opts.bundles[opts.bundle]) {
        this.baseOptions = xtend(this.baseOptions, opts.bundles[opts.bundle]);
    }


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

        vopts.plugin = nonMendelPlugins(vopts.plugin);

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
    // the parts that we care about pipeline are:
    // record, deps, json, unbom, unshebang
    // the later 3 are just small transformations we also need
    // but semantically we are dealing with deps
    var deps = bundle.pipeline.get('unshebang');
    var self = this;

    deps.push(mendelify(self.variationsWithBase));
    deps.push(through.obj(function(row, enc, next) {
        self.pushBundleManifest(row);
        this.push(row);
        next();
    }));

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
            if (typeof data[prop] !== 'undefined') {
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
            // write a copy of the two offenders on a temp directory
            var tempDir = tmp.dirSync().name;
            var filename = id.replace(/\//g, '_');
            fs.writeFileSync(path.join(tempDir, 'A.'+filename),
                existingData.data[variationIndex].source);
            fs.writeFileSync(path.join(tempDir, 'B.'+filename),
                dep.source);

            throw new Error('Files with same variation ('+
                variation+') and id ('+id+') should have the same SHA' +
                '\nsee ' + path.resolve(tempDir) + ' for details.');
        }
    }
}

MendelBrowserify.prototype.doneManifest = function() {
    var bundleManifest = this.sortedManifest();

    mkdirp.sync(this.opts.outdir);

    var manifest = path.resolve(
        defined(this.baseOptions.outdir, this.opts.outdir),
        defined(this.baseOptions.manifest, this.opts.manifest)
    );
    fs.writeFile(
        manifest, JSON.stringify(bundleManifest, null, 2),
        function (err) {
            if (err) throw err;
        }
    );
}

MendelBrowserify.prototype.sortedManifest = function() {
    var sortedManifest = {
        indexes: {},
        bundles: []
    };

    var self = this;
    Object.keys(this._manifestIndexes).sort().forEach(function(file) {
        var bundle = self._manifestBundles[self._manifestIndexes[file]];
        sortedManifest.bundles.push(bundle);

        var index = sortedManifest.bundles.indexOf(bundle);
        sortedManifest.indexes[file] = index;
        bundle.index = index;

        bundle.data.forEach(function(dep) {
            var oldSubDeps = dep.deps;
            var newSubDeps = {};
            Object.keys(oldSubDeps).sort().forEach(function(key) {
                newSubDeps[key] = oldSubDeps[key];
            });
            dep.deps = newSubDeps;
        });

    });

    return sortedManifest;
}

MendelBrowserify.prototype.writeVariation = function(bundle) {
    var variationOut = this.variationDest(bundle);

    return bundle.bundle().pipe(fs.createWriteStream(variationOut));
}

MendelBrowserify.prototype.variationDest = function(bundle) {
    var variation = bundle.variation.id;
    var filename = path.parse(this.opts.outfile).base;

    var variationOut = path.resolve(
        defined(
            this.baseOptions.bundlesoutdir,
            this.opts.bundlesoutdir
        ),
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

function nonMendelPlugins(plugins) {
    return [].concat(plugins).filter(Boolean).filter(function(plugin) {
        if (Array.isArray(plugin)) plugin = plugin[0];
        if (typeof plugin === 'string') {
            return plugin !== 'mendel-browserify';
        } else if(MendelBrowserify.constructor === plugin.constructor) {
            return false;
        }
        return true;
    });
}

function addTransform(bundle) {
    // This is unfortunate, we need to be the last require transform
    // I will pay someone a beer if they find out a better way
    bundle._transformOrder += 50;
    bundle.transform(require("mendel-treenherit"), {
        dirs: bundle.variation.chain,
    });
    bundle._transformOrder -= 50;
}

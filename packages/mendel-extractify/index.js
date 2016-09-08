/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var xtend = require('xtend');
var fs = require('fs');
var path = require('path');
var through = require('through2');
var proxy = require('mendel-development/proxy');
var onlyPublicMethods = proxy.onlyPublicMethods;

// Run browserify with --debug to see al pipeline steps we take
var debug = false;

module.exports = MendelExtractify;

function MendelExtractify(baseBundle, pluginOptions) {
    if (!(this instanceof MendelExtractify)) {
        return new MendelExtractify(baseBundle, pluginOptions);
    }
    var baseOptions = baseBundle._options;
    baseOptions.basedir = baseOptions.basedir || process.cwd();

    if (!pluginOptions.extract) return;
    if (Array.isArray(pluginOptions.extract._)) {
        pluginOptions.extract = pluginOptions.extract._;
    }
    if (!Array.isArray(pluginOptions.extract)) return;
    pluginOptions.extract = pluginOptions.extract.filter(Boolean);
    if (!pluginOptions.extract.length) return;

    if (baseOptions.debug) {
        debug = true;
    }

    // This array will hold all childBudle entries, so we can ignore it later
    // Effectivelly doing the same as bundle.external() but after the record
    // phase
    var externalEntries = [];

    // This array will hold all potential exposed files
    // This files are required by external bundles, but if present on baseBundle
    // it should be exposed
    var potentialExposes = [];

    // This will be used to store any files that should be external to a child
    // bundle. This will be used later to remove common dependencies that
    // the baseBundle already packed.
    var childExternalBundles = [];

    // This async hold can be hard to understand. When baseBundle.bundle() is
    // called by browserify, we need to pause it until we know all
    // potentialExposes. For that, we have a counter for each childBundle and
    // we count how many are done pushing files to potentialExposes.
    var waitFor = pluginOptions.extract.length;
    var extractDone = false;
    var extractCheck = function() {
        if (waitFor === 0 && extractDone) extractDone();
    };
    var extractReady = function() {
        waitFor--;
        extractCheck();
    };
    // Once all is called and once record phase is done, we can proceed to the
    // next browserify step
    baseBundle.pipeline.get('record').push(
        through.obj(function (row, enc, nextRecord) {
            this.push(row);
            nextRecord();
        }, function(nextPipelineStep) {
            extractDone = function() {
                nextPipelineStep();
                externalEntries.forEach(function(file) {
                    baseBundle._external.push(file);
                    baseBundle._external.push(
                        '/' + path.relative(baseOptions.basedir, file)
                    );
                });
            };
            extractCheck();
        })
    );

    // This is where we modify the base bundle to exclude some files and expose
    // other files
    // We don't know the callbacks upfront, but let's bookkeep this here
    // And will become clear why we need it in the childBundle step.
    var baseDepsDoneCallbacks = [];
    baseBundle.pipeline.get('deps').push(
        through.obj(function (row, enc, nextDep) {
            // This is exactly what browserify does internally to
            // external methods. They skip this.push(row) on that file
            // We need to call bundle.external() so this bundle is able to
            // require this file from the extracted bundle.
            if (
                externalEntries.indexOf(row.id) >= 0    ||
                externalEntries.indexOf(row.file) >= 0
            ) {
                // baseBundle.external(row.id || row.file);
                return nextDep();
            }

            // This is exaclty what browserify does for exposes.
            // It adds expose (usually relative to basedir) and use the
            // same string as id. Unfortunatly, we need to modify the
            // bundle._expose array, because this reference was already passed
            // to module deps at this time (although it is not used yet).
            if (
                potentialExposes.indexOf(row.id) >= 0      ||
                potentialExposes.indexOf(row.file) >= 0
            ) {
                row.expose = '/' + path.relative(baseOptions.basedir, row.file);
                row.id = row.expose;
                baseBundle._expose[row.expose] = row.file;

                // Every file that we expose should not be on childBundles
                childExternalBundles.push(row.file);
            }

            this.push(row);
            nextDep();
        }, function(nextPipelineStep) {
            baseDepsDoneCallbacks.forEach(function (callback) {
                callback();
            });
            nextPipelineStep();
        })
    );

    baseBundle.pipeline.get('record').push(pipelineLogger('base record'));
    baseBundle.pipeline.get('deps').push(pipelineLogger('base deps'));
    baseBundle.pipeline.get('wrap').push(pipelineLogger('base wrap'));

    pluginOptions.extract.forEach(function(inputChildOptions) {
        var browserify = baseBundle.constructor;
        var pipeline = baseBundle.pipeline.constructor;

        if (Array.isArray(inputChildOptions.entries._)) {
            inputChildOptions.entries = inputChildOptions.entries._;
        }
        var childOptions = xtend({}, baseOptions, inputChildOptions);

        childOptions.plugin = avoidSamePlugin(childOptions.plugin);

        var childBundle = browserify(childOptions);

        proxy(browserify, baseBundle, childBundle, {
            filters: [onlyPublicMethods],
            exclude: ['bundle']
        });

        proxy(pipeline, baseBundle.pipeline, childBundle.pipeline, {
            filters: [onlyPublicMethods]
        });

        // There is a chicken and egg problem, the baseBundle needs to know the
        // childBundles records, so it can use it as externals itself.
        // Also the baseBundle needs the childBundle deps, to expose some of the
        // common files both use.
        // Finally, the childBundles need the baseBundle to run first, so it
        // knows that every common file should be external
        // The way we solve this, is to do a "dry run" of the childBundles.

        // During initialization of the baseBundle we pause at record phase. And
        // we proceed to the dry run of the baseBundles. Once we have all deps
        // on the childBundles, the dryRun is over and we can stop processing
        // the baseBundles and proceed with all regular phases on the baseBundle
        // Once baseBundle is done, we restart the bundling of the childBundles
        // This is faster (because browserify caches transforms) and on the
        // second run we skip all modules that are on baseBundle.

        /*
            This is the expected order:
                * parallel record phase (child record in dry mode)
                * child deps phase (dry)
                * child done (dry)
                * base deps
                * parallel base continues (and next step starts)
                * child record (normal)
                * child deps (normal)
                * child done (normal)
        */
        var dryRun = true;

        // This is a bit more complicated,
        childBundle.on('reset', prepareChildPipeline);
        prepareChildPipeline();
        function prepareChildPipeline() {

            // During child record phase, we store the records to be marked as
            // external bundle on the baseBundle
            childBundle.pipeline.get('record').push(
                through.obj(function (row, enc, nextRecord) {
                    if (dryRun) {
                        row.id && externalEntries.push(row.id);
                        row.file && externalEntries.push(row.file);
                    } else  if (row.file) {
                        // do the same to expose childRecords, so base bundle
                        // can require it
                        row.expose = '/' + path.relative(
                            baseOptions.basedir, row.file
                        );
                        row.id = row.expose;
                        childBundle._expose[row.expose] = row.file;
                    }
                    this.push(row);
                    nextRecord();
                }, function(nextPipelineStep) {
                    if (!dryRun) {
                        childExternalBundles.forEach(function(file) {
                            childBundle._external.push(file);
                            childBundle._external.push(
                                '/' + path.relative(baseOptions.basedir, file)
                            );
                        });
                    }
                    nextPipelineStep();
                })
            );

            childBundle.pipeline.get('deps').push(
                through.obj(function (row, enc, nextDep) {
                    if (
                        dryRun &&
                        -1 === externalEntries.indexOf(row.file)
                    ) {
                        potentialExposes.push(row.id);
                        potentialExposes.push(row.file);
                    }
                    // IMPORTANT: We don't push rows on first run, making this
                    // bundle useless until second run
                    if (
                        !dryRun &&
                        -1 === childExternalBundles.indexOf(row.file)
                    ) {
                        this.push(row);
                    }
                    nextDep();
                },function(nextPipelineStep) {
                    if (dryRun) extractReady();
                    nextPipelineStep();
                })
            );

            var dryName = dryRun ? ' (dry)' : '';
            childBundle.pipeline.get('record').push(
                pipelineLogger('child record' + dryName)
            );
            childBundle.pipeline.get('deps').push(
                pipelineLogger('child deps' + dryName)
            );
            childBundle.pipeline.get('wrap').push(
                pipelineLogger('child wrap' + dryName)
            );
        }

        // Since we proxy methods, we need to wait for the baseBundle
        // bundle command, which means no more writes to records or
        // to the pineline. At this point is safe to start our bundle
        baseBundle.on('bundle', function onBaseBundleStart() {
            childBundle.bundle(function(err) {
                if (err) console.log(err);

                // The reason we add this callback after running the bundle,
                // is because the first time we render the bundle useless
                // by not pushing any deps.
                if (-1 === baseDepsDoneCallbacks.indexOf(runRealChildBundle)) {
                    baseDepsDoneCallbacks.push(runRealChildBundle);
                }
            });
        });

        function runRealChildBundle() {
            dryRun = false;
            var out = process.stdout;

            if (
                childOptions.outfile &&
                childOptions.outfile !== baseOptions.outfile
            ) out = childOptions.outfile;

            childBundle.bundle().pipe(
                fs.createWriteStream(out)
            );
        }
    });
}

function pipelineLogger(name) {
    return through.obj(function (row, enc, next) {
        if (debug && !/wrap/.test(name)) {
            console.log(name, row.file || Object.keys(row));
            if (row.expose) {
                console.log('\texpose:', row.expose);
            }
        }
        this.push(row);
        next();
    }, function(next) {
        if (debug) console.log('--end step', name);
        next();
    });
}


function avoidSamePlugin(plugins) {
    return [].concat(plugins).filter(Boolean).filter(function(plugin) {
        if (Array.isArray(plugin)) plugin = plugin[0];
        if (typeof plugin === 'string') {
            return plugin !== 'mendel-extractify';
        } else if(MendelExtractify.constructor === plugin.constructor) {
            return false;
        }
        return true;
    });
}

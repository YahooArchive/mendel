/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var async = require('async');
var inspect = require('util').inspect;
var resolve = require('resolve');

var sortManifest = require('mendel-development/sort-manifest');
var validateManifest = require('mendel-development/validate-manifest');

module.exports = postProcessManifests;

function postProcessManifests(config) {
    var resolveProcessor = processorResolver.bind(null, config);

    var processors = [
        [loadManifests, config]
    ].concat(config.manifestProcessors).concat([
        [sortManifestProcessor, config],
        [validateManifestProcessor, config],
        [writeManifest, config]
    ]);

    async.map(processors, resolveProcessor, function(err, processors) {
        if (err) throw err;
        var input = config.bundles;

        async.eachSeries(processors,
        function(processorPair, doneStep) {
            var processor = processorPair[0];
            var opts = processorPair[1];
            if(config.verbose) {
                opts.verbose = config.verbose;
                console.log('Running manifest processor', inspect(processor));
            }

            processor(input, opts, function(output) {
                input = output;
                doneStep();
            });
        });
    });
}

function processorResolver(config, processorIn, doneProcessor) {
    if (!Array.isArray(processorIn)) {
        return processorResolver(config, [processorIn, {}], doneProcessor);
    }

    var processor = processorIn[0];
    var opts = processorIn[1];
    if (typeof processor === 'string') {
        var resolveOpts = {
            basedir: config.basedir
        };
        resolve(processor, resolveOpts, function (err, path) {
            if (err) return doneProcessor(err);
            var newProcessor = [require(path), opts];
            doneProcessor(null, newProcessor);
        });
    } else {
        doneProcessor(null, processorIn);
    }
}

function loadManifests(bundles, config, next) {
    var manifests = bundles.reduce(function(manifests, bundle) {
        manifests[bundle.bundleName] = require(
            path.join(config.outdir, bundle.manifest)
        );
        return manifests;
    }, {});
    next(manifests);
}

function sortManifestProcessor(manifests, config, next) {
    Object.keys(manifests).forEach(function(bundleName) {
        manifests[bundleName] = (sortManifest(
            manifests[bundleName].indexes,
            manifests[bundleName].bundles
        ));
    });
    next(manifests);
}

function validateManifestProcessor(manifests, config, next) {
    Object.keys(manifests).forEach(function(bundleName) {
        var filename = config.bundles.filter(function(bundle) {
            return bundle.bundleName === bundleName;
        })[0].manifest;
        validateManifest(
            manifests[bundleName],
            filename,
            'manifestProcessors'
        );
    });
    next(manifests);
}

function writeManifest(manifests, config, next) {
    Object.keys(manifests).forEach(function(bundleName) {
        var filename = config.bundles.filter(function(bundle) {
            return bundle.bundleName === bundleName;
        })[0].manifest;
        fs.writeFileSync(
            path.join(config.outdir, filename),
            JSON.stringify(manifests[bundleName], null, 2)
        );
    });
    next();
}




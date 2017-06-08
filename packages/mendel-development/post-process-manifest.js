/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var async = require('async');
var inspect = require('util').inspect;
var resolve = require('resolve');
var debug = require('debug')('mendel-manifest-postprocess');

var sortManifest = require('./sort-manifest');
var validateManifest = require('./validate-manifest');

module.exports = postProcessManifests;

function postProcessManifests(config, finish) {
    debug('start');
    var resolveProcessor = processorResolver.bind(null, config);

    var processors = [
        [loadManifests, config],
    ].concat(config.manifestProcessors).concat([
        [sortManifestProcessor, config],
        [validateManifestProcessor, config],
        [writeManifest, config],
    ]).filter(Boolean);

    async.map(processors, resolveProcessor, function(err, processors) {
        // istanbul ignore if
        if (err) throw err;
        var input = config.bundles;

        async.eachSeries(processors,
        function(processorPair, doneStep) {
            var processor = processorPair[0];
            var opts = processorPair[1] || {};
            debug('running ' + inspect(processor));
            opts.mendelConfig = config;
            try {
                processor(input, opts, function(output) {
                    input = output;
                    doneStep();
                });
            } catch(e) {
                doneStep(e);
            }
        }, finish);
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
            basedir: config.basedir,
        };
        resolve(processor, resolveOpts, function (err, path) {
            // istanbul ignore if
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
        var file = path.join(config.outdir, bundle.manifest);
        delete require.cache[require.resolve(file)];
        manifests[bundle.bundleName] = require(file);
        return manifests;
    }, {});
    next(manifests);
}

function sortManifestProcessor(manifests, config, next) {
    Object.keys(manifests).forEach(function(bundleName) {
        manifests[bundleName] = sortManifest(manifests[bundleName]);
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
        var file = path.join(config.outdir, filename);
        fs.writeFileSync(
            file,
            JSON.stringify(manifests[bundleName], null, 2)
        );
        delete require.cache[require.resolve(file)];
    });
    next();
}




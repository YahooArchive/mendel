var test = require('tap').test;
var fs = require('fs');
var path = require('path');
var tmp = require('tmp');

// Since this file re-writes stuff, lets work on a copy
var realSamples = path.join(__dirname, './manifest-samples/');
var copySamples = tmp.dirSync().name;

var postProcessManifests = require('../bin/post-process-manifest');

test('postProcessManifests loads manifests', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(1);

    postProcessManifests({
        outdir: copySamples,
        bundles: [{
            bundleName: 'minimal',
            manifest: 'minimal.manifest.json'
        }],
    }, t.error);
});

test('postProcessManifests sorts and cleans manifests', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(4);

    postProcessManifests({
        outdir: copySamples,
        bundles: [{
            bundleName: 'bad-sort',
            manifest: 'bad-sort.manifest.json'
        }],
    }, function(error) {
        t.error(error);
        var result = require(path.join(copySamples, 'bad-sort.manifest.json'));

        t.equal(result.bundles.length, 3, 'removed one unused bundle');
        t.deepEqual(result.indexes,
            { bar: 0, foo: 1, zoo: 2 }, 'reordered indexes');
        t.deepEqual(Object.keys(result.bundles[1].data[0].deps),
            ["bar", "zoo"], 'reordered deps');
    });
});


test('postProcessManifests validates manifests', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(1);

    postProcessManifests({
        outdir: copySamples,
        bundles: [{
            bundleName: 'bad',
            manifest: 'bad.manifest.json'
        }],
    }, function(err) {
        t.equal(err.code, "INVALID_MANIFEST", "should validate manifests");
    });
});


test('postProcessManifests applying post-processors', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(4);

    var calls = [];
    function passThroughProcessor(manifests, config, next) {
        calls.push(arguments);
        next(manifests);
    }
    // yup, kinda nasty, but oh well, it is just tests
    module.exports = function secondPassThrough(manifests, config, next) {
        calls.push('external file');
        next(manifests);
    };
    postProcessManifests({
        manifestProcessors:[
            [passThroughProcessor, {'LMAO':"the french smiley cat"}],
            path.resolve(__filename)
        ],
        outdir: copySamples,
        bundles: [{
            bundleName: 'minimal',
            manifest: 'minimal.manifest.json'
        }],
    }, function(error) {
        t.error(error);
        t.equals(calls.length, 2, 'calls the post-processors');
        t.equals(calls[0][1].LMAO,
            "the french smiley cat", 'pass correct options');
        t.equals(calls[1],
            'external file', 'loads external processors');
    });
});



function copyRecursiveSync(src, dest) {
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  if (exists && isDirectory) {
    try{fs.mkdirSync(dest);} catch(e) {/**/}
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

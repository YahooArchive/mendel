/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var test = require('tap').test;
var fs = require('fs');
var path = require('path');
var tmp = require('tmp');

// Since this file re-writes stuff, lets work on a copy
var realSamples = path.join(__dirname, './manifest-samples/');
var copySamples = tmp.dirSync().name;

var postProcessManifests = require('../bin/post-process-manifest');
var uglify = require('../packages/mendel-manifest-uglify');

var simpleCompressionSize;

test('mendel-manifest-uglify compress', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(2);

    postProcessManifests({
        // verbose: true, // remember to use this for debug
        manifestProcessors:[
            [uglify],
        ],
        basedir: realSamples,
        outdir: copySamples,
        bundles: [{
            bundleName: 'uncompressed',
            manifest: 'one-file.manifest.json'
        }],
    }, function(error) {
        t.error(error);
        var real = require(
            path.join(realSamples, 'one-file.manifest.json'));
        var compressed = require(
            path.join(copySamples, 'one-file.manifest.json'));
        var realSize = real.bundles[0].data[0].source.length;
        var compressedSize = compressed.bundles[0].data[0].source.length;
        simpleCompressionSize = compressedSize;
        t.assert(compressedSize/realSize < 0.8, 'compressed file');
    });
});

test('mendel-manifest-uglify skips based on bundle id', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(2);

    postProcessManifests({
        // verbose: true, // remember to use this for debug
        manifestProcessors:[
            [uglify, {
                bundles: ['no-bundle-has-this-name']
            }],
        ],
        basedir: realSamples,
        outdir: copySamples,
        bundles: [{
            bundleName: 'uncompressed',
            manifest: 'one-file.manifest.json'
        }],
    }, function(error) {
        t.error(error);
        var real = require(
            path.join(realSamples, 'one-file.manifest.json'));
        var compressed = require(
            path.join(copySamples, 'one-file.manifest.json'));
        var realSize = real.bundles[0].data[0].source.length;
        var compressedSize = compressed.bundles[0].data[0].source.length;
        simpleCompressionSize = compressedSize;
        t.equal(compressedSize, realSize, 'dont compressed skipped');
    });
});

test('mendel-manifest-uglify compress with options', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(2);

    postProcessManifests({
        // verbose: true, // remember to use this for debug
        manifestProcessors:[
            [uglify, {
                uglifyOptions: {
                    mangle: {
                        eval: true,
                        toplevel: true
                    },
                    mangleProperties: true
                }
            }],
        ],
        basedir: realSamples,
        outdir: copySamples,
        bundles: [{
            // just re-using, important part is that are some files there
            bundleName: 'uncompressed',
            manifest: 'one-file.manifest.json'
        }],
    }, function(error) {
        t.error(error);
        var mangled = require(
            path.join(copySamples, 'one-file.manifest.json'));
        var extraMangleSize = mangled.bundles[0].data[0].source.length;
        t.assert(extraMangleSize/simpleCompressionSize < 0.8, 'compressed with options');
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

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

var postProcessManifests = require(
    'mendel-development/post-process-manifest');
var extract = require('../packages/mendel-manifest-extract-bundles');

test('postProcessManifests applying post-processors', function (t) {
    copyRecursiveSync(realSamples, copySamples);
    t.plan(4);

    postProcessManifests({
        // verbose: true, // remember to use this for debug
        manifestProcessors:[
            [extract, {
                from: 'bad-sort',
                external: 'foo-is-children',
            }],
        ],
        outdir: copySamples,
        bundles: [{
            // just re-using, important part is that are some files there
            bundleName: 'bad-sort',
            manifest: 'bad-sort.manifest.json',
        }, {
            bundleName: 'foo-is-children',
            manifest: 'foo-is-children.manifest.json',
        }],
    }, function(error) {
        t.error(error);
        var resultFrom = require(
            path.join(copySamples, 'bad-sort.manifest.json'));
        var resultExternal = require(
            path.join(copySamples, 'foo-is-children.manifest.json'));
        t.equals(resultExternal.bundles.length, 2, 'removed external bundles');
        t.equals(resultFrom.bundles[1].expose,
            'foo', 'exposed bundle');
        t.equals(resultFrom.bundles[1].data[0].expose,
            'foo', 'exposed variation');
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

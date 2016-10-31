/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var temp = require('temp');
var test = require('tap').test;
var rimraf = require('rimraf');
var browserify = require('browserify');
var requirify = require('../packages/mendel-requirify');
var treenherit = require('../packages/mendel-treenherit');
var requireTransform = require('../packages/mendel-development/require-transform');

var srcDir = path.resolve(__dirname, './app-samples/1');

temp.track();
var buildDir = temp.mkdirSync('build-requirify');

var entry = 'app/number-list.js';
var variationDirs = ['test_A', 'app'];

var mendelRequireRegexp = /__mendel_require__\(/;
var requireRegexp = /\brequire\(/;

function run(t, outDir, outFile, cb) {
    t.plan(4);
    var b = browserify({
        basedir: srcDir,
        entries: [path.join(srcDir, entry)]
    });
    b.transform(treenherit, {
        dirs: variationDirs
    });
    b.plugin(requirify, {
        outdir: outDir,
        dirs: variationDirs
    });
    b.bundle(function (err) {
        if (err) {
            t.fail(err.message || err);
        }

        // wait for file to be written
        setTimeout(function() {
            var src;
            try {
                src = fs.readFileSync(outFile, 'utf-8');
            } catch (e) {
                t.fail('Failed to open dest file: ' + outFile);
            }

            t.match(src, mendelRequireRegexp);
            t.notMatch(src, requireRegexp);

            var wrapper = requireTransform.wrapper;
            t.equal(src.indexOf(wrapper[0]), 0, 'wrapper prelude pos');
            t.equal(src.indexOf(wrapper[1]), src.length - wrapper[1].length, 'wrapper epilogue pos');

            temp.cleanup(function() {
                if (cb) {
                    return cb(t);
                }
                t.end();
            });
        }, 150);
    });
}

test('mendel-requirify', function (t) {
    var outFile = path.join(buildDir, entry);

    run(t, buildDir, outFile);
});

test('mendel-requirify-defaults', function (t) {
    var outDir = path.join(process.cwd(), 'build-requirify');
    var outFile = path.join(outDir, entry);

    run(t, null, outFile, function (t) {
        rimraf(outDir, function () {
            t.end();
        });
    });
});

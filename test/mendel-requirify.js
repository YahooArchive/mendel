var fs = require('fs');
var path = require('path');
var temp = require('temp');
var test = require('tap').test;
var rimraf = require('rimraf');
var through = require('through2');
var browserify = require('browserify');
var requirify = require('../packages/mendel-requirify');
var requireTransform = require('../packages/mendel-development/require-transform');

var srcDir = path.resolve(__dirname, './app-samples/1');

temp.track();
var buildDir = temp.mkdirSync('mendel-requirify');

var entry = 'app/number-list.js';
var experiment = 'test_A';

var mendelRequireRegexp = /__mendel_require__\(/;
var requireRegexp = /\brequire\(/;

function run(t, outDir, outFile, rowTransform, cb) {
    t.plan(4);
    var b = browserify(path.join(srcDir, entry));
    b.pipeline.get('deps').push(through.obj(function (row, enc, next) {
        this.push(rowTransform(row));
        next();
    }));
    b.plugin(requirify, {
        outdir: outDir
    });
    b.on('mendel-requirify:finish', function () {
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
    });
    b.bundle(function (err) {
        if (err) {
            t.fail(err.message || err);
        }
    });
}

test('mendel-requirify', function (t) {
    var outFile = path.join(buildDir, experiment, path.basename(entry));

    run(t, buildDir, outFile, function(row) {
        row.id = path.basename(row.file);
        row.variation = experiment;
        return row;
    });
});

test('mendel-requirify-defaults', function (t) {
    var outDir = path.join(process.cwd(), 'mendel-requirify');
    var outFile = path.join(outDir, experiment, path.basename(entry));

    run(t, null, outFile, function(row) {
        row.id = path.basename(row.file);
        row.variation = experiment;
        return row;
    }, function (t) {
        rimraf(outDir, function () {
            t.end();
        })
    });
});

var path = require('path');
var temp = require('temp');
var test = require('tap').test;
var browserify = require('browserify');
var mendelify = require('../packages/mendel-browserify');
var requirify = require('../packages/mendel-requirify');
var Loader = require('../packages/mendel-loader-server');

var srcDir = path.resolve(__dirname, './app-samples/1');

test('mendel-loader-server', function(t){
    t.plan(12);
    temp.track();

    var buildDir = temp.mkdirSync('mendel-loader-server');
    var mountDir = path.join(buildDir, 'server');

    var b = browserify({
        entries: [
            path.join(srcDir, 'app/index.js'),
            path.join(srcDir, 'app/throws.js'),
        ],
        outfile: path.join(buildDir, 'app.js'),
        basedir: srcDir
    });

    b.plugin(mendelify);
    b.plugin(requirify, {
        outdir: mountDir
    });

    b.bundle(function(err) {
        if (err) {
            return t.fail(err.message || err);
        }
        setTimeout(function() {
            var loader = new Loader({
                basedir: srcDir,
                mountdir: mountDir
            });

            var inputs = [{
                variations: ['test_B'],
                expect: 7
            }, {
                variations: ['test_C'],
                expect: 11
            }, {
                variations: ['test_B', 'test_C'],
                expect: 7
            }, {
                variations: ['test_C', 'test_B'],
                expect: 7
            }];

            inputs.forEach(function (i) {
                var resolver = loader.resolver({
                    bundle: 'app',
                    variations: i.variations
                });

                var variation = i.variations.join(',');

                var someNumber = resolver.require('some-number.js');
                t.equal(someNumber(), i.expect, 'some-number.js ' + variation + ' variation');

                var numberList = resolver.require('number-list.js');
                t.equal(numberList()[0], i.expect, 'number-list.js ' + variation + ' variation');

                t.throws(function () {
                    var invalid = resolver.require('throws.js');
                }, {message: 'Intentional error'});
            });

            temp.cleanup(function() {
                t.end();
            });
        }, 1000);
    });
});

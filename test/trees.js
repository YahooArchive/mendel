var test = require('tap').test;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var exec = require('child_process').exec;

var MendelTrees = require('../lib/trees');

var appPath = path.resolve(__dirname, 'app-samples/1/')
var appBuild = path.join(appPath, 'build');
var manifestPath = path.join(appBuild, 'app.manifest.json');
mkdirp.sync(appBuild);

test('MendelTrees initialization', function (t) {
    t.plan(5);

    t.doesNotThrow(MendelTrees, "won't throw at init without params");
    t.equal(MendelTrees().constructor, MendelTrees, "returns instance");
    t.match(MendelTrees().variations, [{
        id: 'base',
        chain: ['base']
    }], "fallback minimal configuration");

    process.chdir(appPath);

    fs.unlinkSync(manifestPath);
    t.throws(MendelTrees, /bundle at path/, 'requires manifest to exist');

    fs.writeFileSync(manifestPath, '{invalid json}');
    t.throws(MendelTrees, /Invalid bundle file/, 'requires valid manifest');

    process.chdir(__dirname);
});

test('MendelTrees private methods', function (t) {
    t.plan(9);
    process.chdir(__dirname);

    var trees = MendelTrees();
    trees.config.basetree = 'base-chain';
    trees.variations = [{
        id: 'a',
        chain: ['a-chain', 'base-chain']
    },{
        id: 'b',
        chain: ['b-chain', 'base-chain']
    },{
        id: 'c',
        chain: ['c-chain', 'b-chain', 'base-chain']
    }, {
        id: 'base',
        chain: ['base-chain']
    }];

    t.equal(
        trees._buildLookupChains([]).length,
        1,
        'returns base if empty input'
    );
    t.equal(
        trees._buildLookupChains(['a']).length,
        2,
        'returns variation and base'
    );
    t.match(
        trees._buildLookupChains(['c'])[0],
        ['c-chain', 'b-chain'],
        "valid chains don't contain base"
    );
    t.equal(
        trees._buildLookupChains(['a-chain']).length,
        1,
        'find variations, not chains'
    );
    t.equal(
        trees._buildLookupChains(['a', 'b']).length,
        3,
        'returns multiple variations'
    );
    t.matches(
        JSON.stringify(trees._buildLookupChains(['a', 'b'])),
        JSON.stringify(trees._buildLookupChains(['b', 'a'])),
        'order is based on configuration, not input'
    );
    t.matches(
        JSON.stringify(trees._buildLookupChains(['c', 'b'])),
        JSON.stringify([['b-chain'], ['c-chain', 'b-chain'], ['base-chain']]),
        'correct full output, with only chains'
    );

    trees.bundles = {
        foo: {
            indexes: {
                'entry.js':0,
                'second.js': 1
            },
            bundles: [{
                entry: true,
                id: 'entry.js',
                deps: {
                    './relative_dependency.js': 'second.js'
                }
            }, {
                id: 'second.js',
                deps: {}
            }]
        }
    };
    var walkedModules = [];
    trees._walkTree('foo', {
        find: function(module) {
            walkedModules.push(module);
            return module;
        }
    });
    t.matches(trees.bundles.foo.bundles[0], walkedModules[0]);
    t.matches(trees.bundles.foo.bundles[1], walkedModules[1]);
});

test('MendelTrees valid manifest runtime', function (t) {
    t.plan(8);

    process.chdir(appPath);
    mkdirp.sync(appBuild);
    exec('./run.sh', { cwd: appPath }, function(error) {
        if (error) return t.fail('should create manifest but failed');

        var trees = MendelTrees();
        var variationCount = trees.variations.length;

        t.matches(Object.keys(trees.bundles), ['app'], 'loads manifest');
        t.equal(variationCount, 4, 'loads manifest');
        t.equal(trees.variations[variationCount-1].id, 'app', 'includes base');

        var result_1 = trees.findTreeForVariations('app', 'test_A');
        var result_2 = trees.findTreeForVariations('app', ['test_A', 'test_B']);

        t.match(result_1, {deps:[], variationMap: {}},
            'Finds one variation with string input');
        t.match(result_2, {deps:[], variationMap: {}},
            'Finds two variations with array input');

        t.match(result_1.variationMap, {
            'index.js': 'app',
            'math.js': 'test_A',
            'some-number.js': 'app',
            'another-number.js': 'app'
        }, 'result_1 variationMap sanity check');
        t.match(result_2.variationMap, {
            'index.js': 'app',
            'math.js': 'test_A',
            'some-number.js': 'test_B',
            'another-number.js': 'app'
        }, 'result_2 variationMap sanity check');


        var hash = result_1.hash;

        var decoded = trees.findTreeForHash('app', hash);

        t.match(result_1.variationMap, decoded.variationMap,
            'retrieves same tree from hahs');
    });
});

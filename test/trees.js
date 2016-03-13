var test = require('tap').test;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var exec = require('child_process').exec;

var MendelTrees = require('../lib/trees');

var appPath = path.resolve(__dirname, 'app-samples/1/')
var appBuild = path.join(appPath, 'build');
var manifestPath = path.join(appBuild, 'app.manifest.json');

test('MendelTrees initialization', function (t) {
    t.plan(7);

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

    mkdirp.sync(appBuild);
    exec('./run.sh', { cwd: appPath }, function(error) {
        if (error) return t.fail('should create manifest but failed');

        var trees = MendelTrees();
        t.matches(Object.keys(trees.bundles), ['app'], 'loads manifest');
        t.equal(trees.variations.length, 4, 'loads manifest');
    });
});

test('MendelTrees private methods', function (t) {
    t.plan(6);

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
        JSON.stringify(trees._buildLookupChains(['a', 'b'])),
        JSON.stringify([['a-chain'],['b-chain'],['base-chain']]),
        'correct full output, with only chains'
    );
});


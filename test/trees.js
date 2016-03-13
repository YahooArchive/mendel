var test = require('tap').test;
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var exec = require('child_process').exec;

test('MendelTrees initialization', function (t) {
    t.plan(7);

    var MendelTrees = require('../lib/trees');

    t.doesNotThrow(MendelTrees, "won't throw at init without params");
    t.equal(MendelTrees().constructor, MendelTrees, "returns instance");
    t.match(MendelTrees().variations, [{
        id: 'base',
        chain: ['base']
    }], "fallback minimal configuration");

    var appPath = path.resolve(__dirname, 'app-samples/1/')
    var appBuild = path.join(appPath, 'build');
    var manifestPath = path.join(appBuild, 'app.manifest.json');

    process.chdir(appPath);
    fs.unlinkSync(manifestPath);
    t.throws(MendelTrees, /bundle at path/, 'requires manifest to exist');

    fs.writeFileSync(manifestPath, '{invalid json}');
    t.throws(MendelTrees, /Invalid bundle file/, 'requires valid manifest');

    mkdirp.sync(appBuild);
    exec('./run.sh', {
        cwd: appPath
    }, function(error) {
        if (error) {
            return t.fail('should create manifest but failed');
        }
        var trees = MendelTrees();
        t.matches(Object.keys(trees.bundles), ['app'], 'loads manifest');
        t.equal(trees.variations.length, 4, 'loads manifest');
    });
});

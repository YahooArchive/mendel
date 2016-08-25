var t = require('tap');
var path = require('path');
var mkdirp = require('mkdirp');

var config = require('../packages/mendel-config/config');
var origEnv = process.env.NODE_ENV;
var where;
var opts;

mkdirp.sync('/tmp/1/2/3/');


process.chdir('/tmp/');

t.contains(config('./1/2/3/').basedir, '1/2/3',
    "recurses and give up if no config found");


process.chdir(path.resolve(__dirname, './config-samples/2/subfolder/'));

t.match(config(), {
    basedir: path.resolve(__dirname, './config-samples/2/'),
    outdir: path.resolve(__dirname, './config-samples/2/mendel'),
    variations: {
       "json_A": null,
       "json_B": ["folder_B"]
    }
}, "find package.json, and match some variations");


process.chdir(path.resolve(__dirname));

where = './config-samples/1/';
t.match(config(where), {basedir: path.resolve(where)},
    "find .mendelrc, basedir defaults to it's path");

t.match(config({
    basedir: path.resolve(where),
    config: false
}), {
    bundles: []
}, "skip file config option for CLI use");

t.match(config({
    basedir: path.resolve(where),
    outdir: path.resolve(where, 'myoutdir'),
    bundlesoutdir: path.resolve(where, 'myoutdir/le-bundles'),
    serveroutdir: path.resolve(where, 'myoutdir/le-node')
}), {
    basedir: path.resolve(where),
    outdir: path.resolve(where, 'myoutdir'),
    bundlesoutdir: path.resolve(where, 'myoutdir/le-bundles'),
    serveroutdir: path.resolve(where, 'myoutdir/le-node')
}, "leaves absolite paths untouched");

where = './config-samples/3/';
t.match(config(where), {
    basedir: path.resolve(__dirname),
    outdir: path.resolve(__dirname, 'config-samples/mendel')
}, "ignores package.json that don't contain 'mendel' entry");

opts = {
    outdir: '../build',
    bundleName: 'testBundle'
};
t.match(config(opts), {
    basedir: path.resolve(__dirname),
    outdir: path.resolve(__dirname, '../build'),
    bundleName: 'testBundle'
}, "custom bundleName and outdir");

where = './config-samples';
t.match(config(where), {
    bundles: [
        {id: 'vendor'},
        {id: 'main', transform: ['reactify']},
    ]
}, 'default environment');

t.match(config(where), {
    bundles: [
        {id: 'vendor'},
        { id: 'main',  external: [
            'react',
            'react-dom',
            './foo.js'
        ]}
    ]
}, 'flattens arrays if externals');

process.env.MENDEL_ENV = 'test';
t.match(config(where), {
    bundles: [
        {id: 'vendor'},
        {id: 'main', transform: ['testify']},
        {id: 'test', entries: ['foo.js', 'bar.js']}
    ]
}, 'test environment');

t.match(config(where), {
    bundlesoutdir: path.resolve(__dirname,
        './config-samples/mendel-build/client-test')
}, "merge env config options");

process.chdir(path.resolve(__dirname, './config-samples/2/subfolder/'));
t.match(config(), {
    base: 'testbase'
}, "merge package.json env configs");

delete process.env.MENDEL_ENV;

process.chdir(path.resolve(__dirname));
process.env.NODE_ENV = 'staging';
t.match(config(where), {
    bundles: [
        {id: 'vendor'},
        {id: 'main', transform: ['reactify']},
        {id: 'test', entries: ['bar.js']}
    ]
}, 'staging environment');

process.env.NODE_ENV = origEnv;

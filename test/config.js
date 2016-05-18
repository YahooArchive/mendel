var t = require('tap');
var path = require('path');
var mkdirp = require('mkdirp');

var config = require('../packages/mendel-config/config');
var where;
var opts;

mkdirp.sync('/tmp/1/2/3/');

process.chdir('/tmp/');

t.match(config('./1/2/3/'), {basedir: path.resolve('/tmp/1/2/3/')},
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


opts = {
    outdir: '../build',
    outfile: 'app.js',
};
t.match(config(opts), {
    basedir: path.resolve(__dirname),
    outdir: path.resolve(__dirname, '../build'),
    bundleName: 'app'
}, "bundleName based on outfile");



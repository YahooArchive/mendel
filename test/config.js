var t = require('tap');
var path = require('path');

var config = require('../lib/config');

process.chdir(path.resolve(__dirname));

t.throws(config, 'throws if no config in path');

var where = './config-samples/1/';
t.match(config(where), {basedir: path.resolve(where)},
    "find .mendelrc, basedir defaults to it's path");

process.chdir(path.resolve(__dirname, './config-samples/2/subfolder/'));
t.match(config(), {
    variations: {
       "json_A": null,
       "json_B": ["folder_B"]
    }
}, "find package.json, and match some variations");


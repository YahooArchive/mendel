/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require("path");
var fs = require("fs");
var xtend = require("xtend");
var yaml = require('js-yaml');

module.exports = function(config) {
    if (typeof config === 'string') config = { basedir: config };
    config = config || {};

    var where = config.basedir && path.resolve(config.basedir) || process.cwd();
    var fileConfig = findConfig(where);
    config.basedir = fileConfig.basedir || where;

    config = xtend(fileConfig, config);

    if (!config.outdir) config.outdir = path.join(config.basedir, 'mendel');
    if (!config.bundleName) {
        if (config.outfile) {
            config.bundleName = path.parse(config.outfile).name;
        } else {
            config.bundleName = 'bundle';
        }
    }

    config.outdir = path.join(config.basedir, config.outdir);
    config.bundlesoutdir = path.join(config.outdir, config.bundlesoutdir || '');
    config.manifest = config.bundleName + '.manifest.json';

    return config;
};

function findConfig(where) {
    var parts = where.split(path.sep);

    do {
        var loc = parts.join(path.sep);
        if (!loc) break;

        var config;
        var rc = path.join(loc, ".mendelrc");
        if (fs.existsSync(rc)) {
            config = loadFromYaml(rc);
            config.basedir = path.dirname(rc);
            return config;
        }

        var packagejson = path.join(loc, "package.json");
        if (fs.existsSync(packagejson)) {
            var pkg = require(packagejson);
            if (pkg.mendel) {
                config = pkg.mendel;
                config.basedir = path.dirname(packagejson);
                return config;
            }
        }

        parts.pop();
    } while (parts.length);

    console.log('no file loaded');
    return {};
}

function loadFromYaml(path) {
    return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

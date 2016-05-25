/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require("path");
var fs = require("fs");
var xtend = require("xtend");
var yaml = require('js-yaml');
var defaultConfig = require('./defaults');

module.exports = function(config) {
    if (typeof config === 'string') config = { basedir: config };
    config = config || {};

    var def = defaultConfig();
    var where = config.basedir && path.resolve(config.basedir) || def.basedir;
    var fileConfig = findConfig(where);
    var environment = process.env.MENDEL_ENV || process.env.NODE_ENV;

    config.basedir = fileConfig.basedir || where;

    config = xtend(def, fileConfig, config);

    if (environment) {
        config.environment = environment;
    }

    var envConfig = config.env[config.environment];

    if (envConfig) {
        config = mergeRecursive(config, envConfig);
    }
    delete config.env;

    config.outdir = path.resolve(config.basedir, config.outdir);

    config.bundlesoutdir = path.join(config.outdir, config.bundlesoutdir);

    config.serveroutdir = path.join(config.outdir, config.serveroutdir);

    config.bundles = Object.keys(config.bundles).map(function(bundleName) {
        var bundle = config.bundles[bundleName];

        bundle.id = bundleName;
        bundle.manifest = bundleName + '.manifest.json';
        bundle.outdir = config.outdir;
        bundle.bundlesoutdir = config.bundlesoutdir;
        bundle.outfile = bundle.outfile || bundleName + '.js';

        return bundle;
    });

    // single bundles and fallback
    if (config.outfile) {
        config.bundleName = path.parse(config.outfile).name;
        config.manifest = config.bundleName + '.manifest.json';
    }

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

    return {};
}

function loadFromYaml(path) {
    return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}


function mergeRecursive(dest, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            if (isObject(dest[key]) && isObject(src[key])) {
                dest[key] = mergeRecursive(dest[key], src[key]);
            } else {
                dest[key] = src[key];
            }
        }
    }
    return dest;
}

function isObject(obj) {
    return ({}).toString.call(obj).slice(8, -1).toLowerCase() === 'object';
}

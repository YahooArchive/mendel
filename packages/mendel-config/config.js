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
    var defaults = defaultConfig();

    // figure out basedir before we look for a fileconfig
    if (typeof config === 'string') config = { basedir: config };
    config = config || {};
    config.basedir = config.basedir || defaults.basedir;

    var fileConfig = {};
    // support --no-config or {config: false} to skip looking for file configs
    if (config.config !== false) {
        fileConfig = findConfig(config.basedir);
    }

    // merge by priority
    config = xtend(defaults, fileConfig, config);

    if (fileConfig.basedir) {
        config.basedir = fileConfig.basedir;
    }

    // merge environment based config
    var environment = process.env.MENDEL_ENV || process.env.NODE_ENV;
    if (environment) {
        config.environment = environment;
    }
    var envConfig = config.env[config.environment];
    if (envConfig) {
        config = mergeRecursive(config, envConfig);
    }
    delete config.env;

    // Final parsing
    if (!path.isAbsolute(config.basedir)) {
        config.basedir = path.resolve(config.basedir);
    }
    if (!path.isAbsolute(config.outdir)) {
        config.outdir = path.join(config.basedir, config.outdir);
    }
    if (!path.isAbsolute(config.bundlesoutdir)) {
        config.bundlesoutdir = path.join(config.outdir, config.bundlesoutdir);
    }
    if (!path.isAbsolute(config.serveroutdir)) {
        config.serveroutdir = path.join(config.outdir, config.serveroutdir);
    }
    config.bundles = parseBundles(config.bundles);


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
            var pkg = require(path.resolve(packagejson));
            if (pkg.mendel) {
                config = pkg.mendel;
                config.basedir = path.dirname(packagejson);
                return config;
            }
        }

        parts.pop();
    } while (parts.length);

    return {
        basedir: where,
    };
}

function loadFromYaml(path) {
    return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

function parseBundles(bundles) {
    if (!bundles) return bundles;
    var bundlesArray = Object.keys(bundles).filter(Boolean);
    if (!bundlesArray.length) return bundlesArray;

    return bundlesArray.map(function(bundleName) {
        var bundle = bundles[bundleName];

        bundle.id = bundleName;
        bundle.bundleName = bundleName;
        bundle.manifest = bundleName + '.manifest.json';

        return bundle;
    }).filter(Boolean);
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

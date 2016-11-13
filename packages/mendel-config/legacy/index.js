/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require("path");
var xtend = require("xtend");
var defaultConfig = require('./defaults');

module.exports = function(config) {
    var defaults = defaultConfig();

    // merge by priority
    config = xtend(defaults, config);
    config.basedir = config.basedir || defaults.basedir;

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

function parseBundles(bundles) {
    // istanbul ignore if
    if (!bundles) return bundles;
    var bundlesArray = Object.keys(bundles).filter(Boolean);
    if (!bundlesArray.length) return bundlesArray;

    return bundlesArray.map(function(bundleName) {
        var bundle = bundles[bundleName];

        bundle.id = bundleName;
        bundle.bundleName = bundleName;
        bundle.manifest = bundleName + '.manifest.json';
        flattenFilenameArrays(bundle);

        return bundle;
    }).filter(Boolean);
}

function mergeRecursive(dest, src) {
    for (var key in src) {
        // istanbul ignore else
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

function flattenFilenameArrays(bundle) {
    ['entries', 'require', 'external', 'exclude', 'ignore']
    .forEach(function(param) {
        var inputArray = bundle[param];
        if (!Array.isArray(inputArray)) return;

        var i = 0;
        while (i <= inputArray.length) {
            var item = inputArray[i];
            if (Array.isArray(item)) {
                Array.prototype.splice.apply(
                    inputArray,
                    [i, 1].concat(item)
                );
            }
            i++;
        }
    });
}

function isObject(obj) {
    return ({}).toString.call(obj).slice(8, -1).toLowerCase() === 'object';
}

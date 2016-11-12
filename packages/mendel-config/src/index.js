/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var debug = require('debug')('mendel:config');
var defaultConfig = require('./defaults');
var TransformConfig = require('./transform-config');
var BundleConfig = require('./bundle-config');
var VariationConfig = require('./variation-config');
var BaseConfig = require('./base-config');
var TypesConfig = require('./types-config');

module.exports = function(config) {
    var defaults = defaultConfig();

    // merge by priority
    config = deepMerge(defaults, config);

    // merge environment based config
    config.environment = config.environment ||
                         process.env.MENDEL_ENV ||
                         process.env.NODE_ENV ||
                         'development';
    var envConfig = config.env[config.environment];

    if (envConfig) {
        config = deepMerge(config, envConfig);
    }

    // Use absolute path for path configs
    config.cwd = path.resolve(config.cwd);
    config.baseConfig = new BaseConfig(config);
    config.variationConfig = new VariationConfig(config);
    config.types = Object.keys(config.types).map(function(typeName) {
        return new TypesConfig(typeName, config.types[typeName]);
    });
    config.transforms = Object.keys(config.transforms).map(transformId => {
        return new TransformConfig(transformId, config.transforms[transformId]);
    });
    config.bundles = Object.keys(config.bundles).map(function(bundleId) {
        return new BundleConfig(bundleId, config.bundles[bundleId]);
    });

    const inspect = require('util').inspect;
    debug(inspect(config, {
        colors: true,
        depth: null,
    }));

    return config;
};

function deepMerge(dest, src) {
    for (var key in src) {
        // istanbul ignore else
        if (src.hasOwnProperty(key)) {
            if (isObject(dest[key]) && isObject(src[key])) {
                dest[key] = deepMerge(dest[key], src[key]);
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

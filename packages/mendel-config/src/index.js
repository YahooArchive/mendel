/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const path = require('path');
const inspect = require('util').inspect;
const debug = require('debug')('mendel:config');

const defaultConfig = require('./defaults');
const TransformConfig = require('./transform-config');
const BundleConfig = require('./bundle-config');
const VariationConfig = require('./variation-config');
const BaseConfig = require('./base-config');
const TypesConfig = require('./types-config');

module.exports = function(rawConfig) {
    const defaults = defaultConfig();
    const pureConfig = onlyKeys(rawConfig, Object.keys(defaults));
    const fullConfig = deepMerge(defaults, pureConfig);

    // merge environment based config
    fullConfig.environment = fullConfig.environment ||
                             process.env.MENDEL_ENV ||
                             process.env.NODE_ENV   ||
                             'development';


    let defaultEnvConfig = fullConfig;
    const envOverrides = fullConfig.env[defaultEnvConfig.environment];
    if (envOverrides) {
        defaultEnvConfig = deepMerge(fullConfig, envOverrides);
    }

    const config = undashConfig(defaultEnvConfig);
    config.variationConfig = undashConfig(config.variationConfig);

    // Use absolute path for path configs
    config.projectRoot = path.resolve(config.projectRoot);
    config.baseConfig = BaseConfig(config);
    config.variationConfig = VariationConfig(config);
    config.types = Object.keys(config.types).map(function(typeName) {
        return new TypesConfig(typeName, config.types[typeName]);
    });
    config.transforms = Object.keys(config.transforms).map(transformId => {
        return new TransformConfig(transformId, config.transforms[transformId]);
    });
    config.bundles = Object.keys(config.bundles).map(function(bundleId) {
        return new BundleConfig(bundleId, config.bundles[bundleId]);
    });

    debug(inspect(config, {
        colors: true,
        depth: null,
    }));

    return config;
};


function undashConfig(dashedConfig) {
    return Object.keys(dashedConfig).reduce((config, key) => {
        const dashRegexp = /\-([a-z])/i;
        if (dashRegexp.test(key)) {
            const newKey = key.replace(dashRegexp, (dash, letter) => {
                return letter.toUpperCase();
            });
            config[newKey] = dashedConfig[key];
        } else {
            config[key] = dashedConfig[key];
        }
        return config;
    }, {});
}


function onlyKeys(oldObj, whitelist) {
    return whitelist.reduce((newObj, key) => {
        newObj[key] = oldObj[key];
        return newObj;
    }, {});
}

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

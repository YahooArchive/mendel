/* Copyright 2015, Yahoo Inc.
   Inspired by https://github.com/babel/babel/blob/d06cfe63c272d516dc4d6f1f200b01b8dfdb43b1/packages/babel-cli/src/babel-doctor/rules/has-config.js
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

const path = require('path');
const inspect = require('util').inspect;
const debug = require('debug')('mendel:config');
const {undash} = require('./util');

const defaultConfig = require('./defaults');
const TransformConfig = require('./transform-config');
const BundleConfig = require('./bundle-config');
const VariationConfig = require('./variation-config');
const GeneratorConfig = require('./generator-config');
const PostGeneratorConfig = require('./post-generator-config');
const OutletConfig = require('./outlet-config');
const BaseConfig = require('./base-config');
const TypesConfig = require('./types-config');
const ShimConfig = require('./shim-config');

module.exports = function(rawConfig) {
    const defaults = defaultConfig();
    const pureConfig = onlyKeys(rawConfig, Object.keys(defaults));
    const fullConfig = deepMerge(defaults, pureConfig);

    let defaultEnvConfig = fullConfig;
    const envOverrides = fullConfig.env[defaultEnvConfig.environment];
    if (envOverrides) {
        defaultEnvConfig = deepMerge(fullConfig, envOverrides);
    }

    // In YAML syntax, we use dash instead of camel case. Normalize it.
    const config = undash(defaultEnvConfig);
    config.variationConfig = undash(config.variationConfig);
    config.routeConfig = config.routeConfig || {};

    // Use absolute path for path configs
    config.projectRoot = path.resolve(config.projectRoot);
    config.baseConfig = BaseConfig(config);
    config.variationConfig = VariationConfig(config);
    config.types = Object.keys(config.types).map(typeName => {
        return new TypesConfig(typeName, config.types[typeName], config);
    });

    // utility function for types as we almost always do this
    (function(types) {
        const map = new Map();
        types.forEach(type => map.set(type.name, type));
        types.get = (name) => map.get(name);
    })(config.types);

    config.transforms = Object.keys(config.transforms).map(id => {
        return new TransformConfig(id, config.transforms[id], config);
    });
    config.bundles = Object.keys(config.bundles).map(function(bundleId) {
        return new BundleConfig(bundleId, config.bundles[bundleId], config);
    });
    config.generators = config.generators.map(g => {
        return new GeneratorConfig(g, config);
    });
    config.postgenerators = config.postgenerators.map(g => {
        return new PostGeneratorConfig(g, config);
    });
    config.outlets = config.outlets.map(o => {
        return new OutletConfig(o, config);
    });

    config.shim = ShimConfig(config);

    validateTypesAndTransforms(config);

    debug(inspect(config, {
        colors: true,
        depth: null,
    }));

    return config;
};

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
            } else if (typeof src[key] !== 'undefined') {
                dest[key] = src[key];
            }
        }
    }
    return dest;
}

function isObject(obj) {
    return ({}).toString.call(obj).slice(8, -1).toLowerCase() === 'object';
}

/**
 * Catches bad configurations like:
 * - Cannot have circular parser dependency
 * - No GST after parser
 **/
function validateTypesAndTransforms(config) {
    const error = [];
    const transformMap = new Map();
    const typeConversation = new Map();
    config.transforms.forEach(xform => transformMap.set(xform.id, xform));
    config.types.forEach(type => typeConversation.set(type.name, type.parserToType));

    config.types.forEach(type => {
        type.transforms
        .filter(transformId => !transformMap.has(transformId))
        .forEach(transformId => {
            error.push([
                `Type "${type.id}" defines transform [${transformId}]`,
                `that does not exist in transforms declaration.`,
            ].join(' '));
        });

        if (type.parser) {
            const badTransforms = type.transforms
            .filter(xformId => transformMap.has(xformId))
            .filter(xformId => transformMap.get(xformId).kind === 'gst');

            if (badTransforms.length) {
                error.push([
                    `Type "${type.id}" cannot define graph source transform`,
                    `[${badTransforms.join(', ')}] when it has a parser.`,
                ].join(' '));
            }
        }
    });

    // Walk parser type conversion to detect cycles
    Array.from(typeConversation.keys()).forEach(key => {
        let currentType = key;
        const visited = new Set();

        while (currentType && !visited.has(currentType)) {
            visited.add(currentType);
            currentType = typeConversation.get(currentType);
        }

        // If currentType does not exist, it means there is no conversion for previous type
        if (currentType) {
            error.push([
                `Type "${key}" leads to circular type conversion that has`,
                `a chain of [${Array.from(visited.keys()).join(', ')}]`,
            ].join(' '));
        }
    });

    if (error.length) {
        throw new Error(
            error.filter(Boolean).reduce((reduced, error) => {
                return reduced += 'x ' + error + '\n';
            }, '[Bad configuration] Configuration is not valid:\n')
        );
    }
}

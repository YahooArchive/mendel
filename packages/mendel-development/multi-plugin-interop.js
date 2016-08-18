/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var proxy = require('./proxy');
var proxyMethod = proxy.proxyMethod;
var inspect = require('util').inspect;
var resolve = require('resolve');
var crypto = require('crypto');

var interop = {};
module.exports = interop;

interop.trackPlugins = function(bundle) {
    verifyOrInit(bundle);
    var listener = {
        plugin: function(plugin, options) {
            plugin = normalizePlugin(bundle, plugin);
            if (Array.isArray(plugin)) options = plugin[1];

            if (plugin.prototype.pluginInterop) return;

            pluginCacheAdd(bundle, plugin, options);
            interop.logDebugInfo(
                bundle, '.plugin()', inspect(plugin));
        }
    }
    bundle.registered = true;
    proxyMethod('plugin', bundle, listener);
};

interop.registerPlugin = function(bundle, plugin, options) {
    verifyOrInit(bundle);
    if (pluginCacheHas(bundle, plugin)) {
        interop.logDebugInfo(bundle, 'duplicate in');
        throw new Error('Duplicate plugin registered');
    }
    pluginCacheAdd(bundle, plugin, options);
    interop.logDebugInfo(bundle, 'registerPlugin', inspect(plugin));
}

interop.filterPlugins = function(bundle, additionalFilter) {
    verifyOrInit(bundle);
    var oldMethod = bundle.plugin;
    bundle.plugin = function(plugin, opts) {
        var pluginFunction = normalizePlugin(bundle, plugin);
        if (pluginCacheHas(bundle, pluginFunction)) {
            // console.log('disallow duplicate');
            return;
        } else {
            // console.log('not a duplicate');
        }

        if (Array.isArray(plugin)) opts = plugin[1];
        if (!additionalFilter || additionalFilter(pluginFunction, opts)) {
            // console.log('allowed to add', inspect(pluginFunction))
            var args = Array.prototype.slice.call(arguments);
            oldMethod.apply(bundle, args);
        }
    }
}

interop.getPlugins = function(bundle) {
    verifyOrInit(bundle);
    return [].concat(bundle._allinteropplugins);
}

interop.addDebugInfo = function(bundle /* all other args appended to logs */) {
    verifyOrInit(bundle);
    Array.prototype.push.apply(
        bundle._interopdebug,
        Array.prototype.slice.call(arguments, 1)
    );
}

interop.logDebugInfo = function(bundle /* all other args prepended to logs */) {
    verifyOrInit(bundle);
    console.log.apply(console, [].concat(
        Array.prototype.slice.call(arguments, 1),
        bundle._interopBundleId,
        '|',
        bundle._interopdebug
    ));
    console.log(inspect(bundle._allinteropplugins, {
        colors:true,
        depth: null
    }));
}

function normalizePlugin(bundle, plugin) {
    if (Array.isArray(plugin)) plugin = plugin[0];
    if (typeof plugin === 'string') {
        var basedir = bundle._options.basedir || process.cwd();
        plugin = require(resolve.sync(plugin, {basedir:basedir}));
    }
    return plugin;
}

function pluginCacheAdd(bundle, plugin, options) {
    bundle._allinteropplugins = bundle._allinteropplugins || [];
    if (!pluginCacheHas(bundle, plugin)) {
        bundle._allinteropplugins.push([plugin, options]);
    }
}

function pluginCacheHas(bundle, plugin) {
    bundle._allinteropplugins = bundle._allinteropplugins || [];
    return bundle._allinteropplugins.some(function(entry) {
        // console.log(inspect(entry[0]), '===', inspect(plugin), entry[0] === plugin);
        return entry[0] === plugin;
    });
}

function verifyOrInit(bundle) {
    if (!bundle._interopBundleId) {
        bundle._allinteropplugins = [];
        bundle._interopdebug = [];
        bundle._interopBundleId = randomId(7);
    }
}

function randomId(len) {
    return crypto.randomBytes(len)
        .toString('base64') // convert to hexadecimal format
        .slice(0,len);   // return required number of characters
}

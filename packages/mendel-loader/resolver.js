/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var Module = require('module');

var natives = Object.keys(process.binding('natives')).reduce(function(res, name){
    res[name] = true;
    return res;
}, {});

var NativeModule = {
    exists: function(name) {
        return natives[name] === true;
    },
    require: require
};

function MendelResolver(parentModule, variations, outdir) {
    if (!(this instanceof MendelResolver)) {
        return new MendelResolver(parentModule, variations, outdir);
    }

    this._parentModule = parentModule || module.parent;
    this._variations = variations;
    this._serveroutdir = outdir;
    this._resolveCache = {};
    this._mendelModuleCache = {};
}

MendelResolver.prototype.require = function (name) {
    if (NativeModule.exists(name)) {
        return NativeModule.require(name);
    }

    var that = this;
    var parent = that._parentModule;
    var modPath = that.resolve(name);
    var modExports = that._mendelModuleCache[modPath];

    if (modExports) {
        return modExports;
    }

    var mod = Module._cache[modPath];

    if (!mod) {
        mod = new Module(modPath, parent);
        Module._cache[modPath] = mod;

        var hadException = true;

        try {
            mod.load(mod.id);
            hadException = false;
        } finally {
            if (hadException) {
                delete Module._cache[modPath];
                delete that._resolveCache[name];
            }
        }
    }

    modExports = mod.exports;

    if (modExports.__mendel_module__) {
        var mendelFn = modExports;
        var mendelMod = {
            parent: parent,
            exports: {},
            require: that.require.bind(that)
        };

        // this is the 'incomplete' module to avoid infinite loops on circular dependencies
        // similar to: https://nodejs.org/api/modules.html#modules_cycles
        that._mendelModuleCache[modPath] = modExports;
        mendelFn.apply(that, [mendelMod.require, mendelMod, mendelMod.exports]);
        modExports = mendelMod.exports;
        // this is the 'complete' module
        that._mendelModuleCache[modPath] = modExports;
    }

    return modExports;
};

MendelResolver.prototype.resolve = function(name) {
    var parent = this._parentModule;

    if (!this._resolveCache[name]) {
        var variation = this._variations[name];

        if (variation) {
            name = path.resolve(path.join(this._serveroutdir, variation, name));
        }

        this._resolveCache[name] = Module._resolveFilename(name, parent);
    }

    return this._resolveCache[name];
};

module.exports = MendelResolver;

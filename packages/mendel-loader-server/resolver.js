/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var Module = require('module');

function MendelResolver(parentModule, variations, outdir) {
    if (!(this instanceof MendelResolver)) {
        return new MendelResolver(parentModule, variations, outdir);
    }

    this._parentModule = parentModule || module.parent;
    this._variations = variations;
    this._serveroutdir = outdir;
    this._resolveCache = {};
}

MendelResolver.prototype.require = function (name) {
    var that = this;
    var parent = that._parentModule;
    var rname = that.resolve(name);
    var modPath = Module._resolveFilename(rname || name, parent);
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

    var modExports = mod.exports;

    if (modExports.__mendel_module__) {
        var mendelFn = modExports;
        var mendelMod = {
            exports: {},
            require: function(request) {
                return MendelResolver.prototype.require.apply(that, [request, parent]);
            }
        };
        mendelFn.apply(that, [mendelMod.require, mendelMod, mendelMod.exports]);
        modExports = mendelMod.exports;
    }

    return modExports.__esModule && modExports.default || modExports;
}

MendelResolver.prototype.resolve = function(name) {
    if (!this._resolveCache[name]) {
        var variation = this._variations[name];
        if (variation) {
            this._resolveCache[name] = path.resolve(path.join(this._serveroutdir, variation, name));
        }
    }
    return this._resolveCache[name];
}

module.exports = MendelResolver;

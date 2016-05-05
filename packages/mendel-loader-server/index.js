/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var Module = require('module');

function MendelLoader(tree) {
    if (!(this instanceof MendelLoader)) {
        return new MendelLoader(tree);
    }

    this._tree = tree;
    this._serveroutdir = tree.config.serveroutdir || process.cwd();
}

MendelLoader.prototype.resolver = function(context) {
    var variations = this._getVariationMap(context);
    return new MendelResolver(variations, this._serveroutdir);
}

MendelLoader.prototype._getVariationMap = function(context) {
    var tree = this._tree.findTreeForVariations(context.bundle, context.variations);
    return tree.variationMap;
}

module.exports = MendelLoader;

function MendelResolver(variations, outdir) {
    this._variations = variations;
    this._serveroutdir = outdir;
    this._resolveCache = {};
}

MendelResolver.prototype.require = function (name) {
    var parent = module.parent;
    var that = this;
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

    return modExports;
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

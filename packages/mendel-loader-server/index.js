var path = require('path');
var Module = require('module');
var MendelTree = require('mendel');

function MendelLoader(config) {
    var self = this;
    self._basedir = config.basedir || process.cwd();
    self._mountdir = config.mountdir || process.cwd();
    self._tree = new MendelTree({
        basedir: self._basedir
    });
}

MendelLoader.prototype.resolver = function(context) {
    var variations = this._getVariationMap(context);
    return new MendelResolver(variations, this._mountdir);
}

MendelLoader.prototype._getVariationMap = function(context) {
    var tree = this._tree.findTreeForVariations(context.bundle, context.variations);
    return tree.variationMap;
}

module.exports = MendelLoader;

function MendelResolver(variations, mountdir) {
    this._variations = variations;
    this._mountdir = mountdir;
    this._resolveCache = {};
}

MendelResolver.prototype.require = function (name) {
    return this._require(name, module.parent);
}

MendelResolver.prototype._require = function (name, parent) {
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
            }
        }
    }

    var modExports = mod.exports;

    if (modExports.__mendel_module__) {
        var mendelFn = modExports;
        var mendelMod = {
            exports: {},
            require: function(request) {
                return MendelResolver.prototype._require.apply(that, [request, parent]);
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
            this._resolveCache[name] = path.resolve(path.join(this._mountdir, variation, name));
        }
    }
    return this._resolveCache[name];
}

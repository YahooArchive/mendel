var path = require('path');
var Module = require('module');
var MendelTree = require('mendel');

var nodeRequire = module.constructor.prototype.require;

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
    //TODO(dgomez): this tree could be cached.
    var tree = this._tree.findTreeForVariations(context.bundle, context.variations);
    return tree.variationMap;
}

module.exports = MendelLoader;

function MendelResolver(variations, mountdir) {
    this._variations = variations;
    this._mountdir = mountdir;
    this._resolveCache = {};
}

MendelResolver.prototype.require = function (name, parent) {
    parent = parent || module.parent;
    var rname = this.resolve(name);
    var modPath = Module._resolveFilename(rname || name, parent);
    var mod = new Module(modPath, module.parent);

    mod.load(mod.id);
    var modExports = mod.exports;

    if (modExports.__mendel_module__) {
        var mendelFn = modExports;
        mendelFn.call(this, this, mod, mod.exports, mod);
        modExports = mod.exports;
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

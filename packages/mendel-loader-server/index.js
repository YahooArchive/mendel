var path = require('path');
var MendelTree = require('mendel/trees');

var nodeRequire = module.constructor.prototype.require;

module.exports = MendelLoader;

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

MendelLoader.prototype.register = function(context) {
    return this.resolver(context).register();
}

MendelLoader.prototype._getVariationMap = function(context) {
    //TODO(dgomez): this tree could be cached.
    var tree = this._tree.findTreeForVariations(context.bundle, context.variations);
    return tree.variationMap;
}

function MendelResolver(variations, mountdir) {
    this._variations = variations;
    this._mountdir = mountdir;
    this._resolveCache = {};
}

MendelResolver.prototype.register = function() {
    var resolver = this;
    module.constructor.prototype.require = function (mod) {
        var rmod = resolver.resolve(mod);
        return nodeRequire.call(this, rmod || mod);
    };
    return this;
}

MendelResolver.prototype.unregister = function() {
    module.constructor.prototype.require = nodeRequire;
    return this;
}

MendelResolver.prototype.resolve = function(mod) {
    if (!this._resolveCache[mod]) {
        var variation = this._variations[mod];
        if (variation) {
            this._resolveCache[mod] = path.resolve(path.join(this._mountdir, variation, mod));
        }
    }
    return this._resolveCache[mod];
}

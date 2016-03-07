var path = require('path');
var Module = require('module');
var mendelConfig = require('mendel/config');
var variations = require('mendel/lib/variations');

var nodeRequire = module.constructor.prototype.require;

module.exports = MendelLoader;

function MendelLoader(config) {
    var self = this;
    self._basedir = config.basedir || process.cwd();
    self._mountdir = config.mountdir || process.cwd();
    self._mendelConfig = mendelConfig(self._basedir);
    self._variations = variations(self._mendelConfig).reduce(function (acc, v) {
        acc[v.id] = v.chain;
        return acc;
    }, {});
    self._manifest = require(path.resolve(config.manifest));
}

MendelLoader.prototype.resolver = function(context) {
    return new MendelResolver(this, context);
}

MendelLoader.prototype.register = function(context) {
    return this.resolver(context).register();
}

MendelLoader.prototype.getChain = function(variationId) {
    return this._variations[variationId] || [];
}

MendelLoader.prototype.getVariation = function(mod, id) {
    var variation;
    var bIdx = this._manifest.indexes[mod];

    if (bIdx !== undefined) {
        var bundle = this._manifest.bundles[bIdx];
        var vIdx = bundle.variations.indexOf(id);
        if (vIdx > -1) {
            variation = bundle.data[vIdx].variation;
        }
    }
    return variation;
}

MendelLoader.prototype.getBaseDir = function() {
    return this._basedir;
}

MendelLoader.prototype.getMountDir = function() {
    return this._mountdir;
}

function MendelResolver(loader, context) {
    this._loader = loader;
    this._mountdir = loader.getMountDir();
    this._context = context;
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
        var variation = this._getVariation(mod);
        if (variation) {
            this._resolveCache[mod] = path.resolve(path.join(this._mountdir, variation, mod));
        }
    }
    return this._resolveCache[mod];
}

MendelResolver.prototype._getVariation = function(mod) {
    var ctxVariations = this._context.variations;
    for (var i = 0; i < ctxVariations.length; i++) {
        var v = ctxVariations[i];
        var chain = this._loader.getChain(v);
        for (var j = 0; j < chain.length; j++) {
            var c = chain[j];
            var variation = this._loader.getVariation(mod, c);
            if (variation) {
                return variation;
            }
        }
    }
}

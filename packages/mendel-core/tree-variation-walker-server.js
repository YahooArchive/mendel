/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var util = require("util");
var MendelVariationWalker = require('./tree-variation-walker');

util.inherits(MendelServerVariationWalker, MendelVariationWalker);

function MendelServerVariationWalker(_lookupChains, _base) {
    if (!(this instanceof MendelServerVariationWalker)) {
        return new MendelServerVariationWalker(_lookupChains, _base);
    }

    MendelVariationWalker.call(this, _lookupChains, _base);

    this._resolveCache = {};
    this._variationMap = {};
}

MendelServerVariationWalker.prototype.find = function(module) {
    var fileId = module.id;
    var resolved;

    if (this._resolveCache[fileId]) {
        return this._resolveCache[fileId];
    } else if (module.data.length === 1) {
        resolved = module.data[0];
    } else {
        var branch = this._resolveBranch(module);
        resolved = branch.resolved;
    }

    this._resolveCache[fileId] = resolved;

    if (resolved.variation) {
        this._variationMap[fileId] = resolved.variation;
    }

    return resolved;
};

MendelServerVariationWalker.prototype.found = function() {
    // This walker doesn't care about deps index nor hashes
    return this._variationMap;
};

module.exports = MendelServerVariationWalker;

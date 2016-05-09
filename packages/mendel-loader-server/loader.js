/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var MendelResolver = require('./resolver');

function MendelLoader(trees, parentModule) {
    if (!(this instanceof MendelLoader)) {
        return new MendelLoader(trees, parentModule);
    }

    this._trees = trees;
    this._serveroutdir = trees.config.serveroutdir || process.cwd();
    this._parentModule = parentModule || module.parent;
}

MendelLoader.prototype.resolver = function(bundle, variations) {
    var tree = this._trees.findTreeForVariations(bundle, variations);
    return new MendelResolver(this._parentModule, tree.variationMap, this._serveroutdir);
}

module.exports = MendelLoader;

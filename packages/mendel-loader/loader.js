/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var MendelResolver = require('./resolver');

function MendelLoader(trees, opts) {
    if (!(this instanceof MendelLoader)) {
        return new MendelLoader(trees, opts);
    }
    opts = opts || {};
    this._trees = trees;

    var config = trees.config;

    this._serveroutdir = config.serveroutdir || process.cwd();
    this._parentModule = opts.parentModule || module.parent;

    var bundles = opts.bundles;
    if (!bundles) {
        bundles = config.bundles.map(function(b) {
            return b.id;
        });
    }
    this._bundles = bundles;
}

MendelLoader.prototype.resolver = function(variations) {
    var variationMap = this._trees.findServerVariationMap(variations);

    return new MendelResolver(this._parentModule, variationMap, this._serveroutdir);
}

module.exports = MendelLoader;

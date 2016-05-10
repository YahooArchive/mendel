/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var MendelResolverDev = require('./resolver-dev');
var resolveVariations = require('./lib/resolve-variations');

function MendelLoaderDev(existingVariations, config, parentModule) {
    if (!(this instanceof MendelLoaderDev)) {
        return new MendelLoaderDev(existingVariations, config, parentModule);
    }

    this._existingVariations = existingVariations;
    this._config = config;
    this._parentModule = parentModule || module.parent;
}

MendelLoaderDev.prototype.resolver = function(bundle, variations) {
    var dirs = resolveVariations(this._existingVariations, variations);
    return new MendelResolverDev(this._parentModule, dirs, this._config);
}

module.exports = MendelLoaderDev;

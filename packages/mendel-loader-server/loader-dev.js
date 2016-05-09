/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var MendelResolverDev = require('./resolver-dev');
var resolveVariations = require('./lib/resolve-variations');

function MendelLoaderDev(existingVariations, serveroutdir, parentModule) {
    if (!(this instanceof MendelLoaderDev)) {
        return new MendelLoaderDev(existingVariations, serveroutdir, parentModule);
    }

    this._existingVariations = existingVariations;
    this._serveroutdir = serveroutdir || process.cwd();
    this._parentModule = parentModule || module.parent;
}

MendelLoaderDev.prototype.resolver = function(bundle, variations) {
    var dirs = resolveVariations(this._existingVariations, variations);
    return new MendelResolverDev(this._parentModule, dirs, this._serveroutdir);
}

module.exports = MendelLoaderDev;

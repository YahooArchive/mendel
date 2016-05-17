/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var fs = require('fs');
var Module = require('module');
var MendelResolver = require('./resolver');
var inherits = require('util').inherits;

function MendelResolverDev(parentModule, dirs, config) {
    if (!(this instanceof MendelResolverDev)) {
        return new MendelResolverDev(parentModule, dirs, config);
    }

    MendelResolver.call(this, parentModule, {}, config.serveroutdir);
    this._dirs = dirs && dirs.length ? dirs : [config.basetree];
}

inherits(MendelResolverDev, MendelResolver);

MendelResolverDev.prototype.resolve = function(name) {
    var outdir = this._serveroutdir;
    var parent = this._parentModule;

    if (!this._resolveCache[name]) {
        var found;

        this._dirs.some(function(dir) {
            var fullPath = path.join(outdir, dir, name);
            if (fs.existsSync(fullPath)) {
                found = fullPath;
                return true;
            }

            return false;
        });

        if (found) {
            name = found;
        }

        this._resolveCache[name] = Module._resolveFilename(name, parent);
    }
    return this._resolveCache[name];
}

module.exports = MendelResolverDev;

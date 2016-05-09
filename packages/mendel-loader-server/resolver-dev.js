/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var fs = require('fs');
// var Module = require('module');
var MendelResolver = require('./resolver');
var inherits = require('util').inherits;

function MendelResolverDev(parentModule, dirs, serveroutdir) {
    if (!(this instanceof MendelResolverDev)) {
        return new MendelResolverDev(parentModule, dirs, serveroutdir);
    }

    MendelResolver.call(this, parentModule, {}, serveroutdir);
    this._dirs = dirs;
}

inherits(MendelResolverDev, MendelResolver);

MendelResolverDev.prototype.resolve = function(name) {
    var outdir = this._serveroutdir;
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
            this._resolveCache[name] = found;
        }
    }
    return this._resolveCache[name];
}

module.exports = MendelResolverDev;

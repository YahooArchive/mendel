/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var MendelResolverDev = require('./resolver');
var resolveVariations = require('mendel-development/resolve-variations');

function MendelLoaderDev(existingVariations, config, parentModule) {
    if (!(this instanceof MendelLoaderDev)) {
        return new MendelLoaderDev(existingVariations, config, parentModule);
    }

    this._existingVariations = existingVariations;
    this._config = config;
    this._parentModule = parentModule || module.parent;
    this._ssrReady = false;

    this._checkSsrReady();
}

MendelLoaderDev.prototype.resolver = function(variations) {
    if (!this.isSsrReady()) {
        console.warn('Warning: Mendel loader could not find server output dir.');
    }
    var dirs = resolveVariations(this._existingVariations, variations);
    return new MendelResolverDev(this._parentModule, dirs, this._config);
};

MendelLoaderDev.prototype.isSsrReady = function() {
    return this._checkSsrReady();
};

var _checkingSsrDir = {};
MendelLoaderDev.prototype._checkSsrReady = function() {
    var that = this;
    var config = that._config;
    var outdir = config.serveroutdir;

    function checkDir(timeout, retryTimes) {
        _checkingSsrDir[outdir] = true;
        that._ssrReady = isValidDir(outdir);

        if (!that._ssrReady && retryTimes > 0) {
            that._checkSsrTimer = setTimeout(function() {
                checkDir(timeout * 2, --retryTimes);
            }, timeout);
        } else {
            clearTimeout(that._checkSsrTimer);
            delete _checkingSsrDir[outdir];
        }
    }

    if (!that._ssrReady && !_checkingSsrDir[outdir]) {
        checkDir(1000, 5);
    }

    return that._ssrReady;
};

module.exports = MendelLoaderDev;

function isValidDir(dir) {
    try {
        fs.accessSync(dir);
        return fs.statSync(dir).isDirectory() &&
            fs.readdirSync(dir).length > 0;
    } catch(e) {
        return false;
    }
}

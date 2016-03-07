/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
var util = require('util');
var xtend = require('xtend');

var deserialize = require('./tree-deserialiser');
var MendelWalker = require('./walker');

util.inherits(MendelHashWalker, MendelWalker)
module.exports = MendelHashWalker;

function MendelHashWalker(inputHash) {
    if (!(this instanceof MendelHashWalker)) {
        return new MendelHashWalker(inputHash);
    }
    MendelWalker.call(this);

    var result = deserialize(inputHash);
    this.error = result.error;
    this.decoded = result.decoded;

    this.inputHash = inputHash;
    this.pathCount = 0;
}

MendelHashWalker.prototype._resolveBranch = function(module) {
    if (this.error) return {};

    var nextPath;
    var resolved;
    if (this.pathCount >= this.decoded.branches.length) {
        this._error('Tree has more paths than hash');
    } else {
        nextPath = this.decoded.branches[this.pathCount];
        resolved = module.data[nextPath];
        if (!resolved) {
            this._error('Hash branch not found in tree');
        }
    }
    this.pathCount++;
    return {
        index: nextPath,
        resolved: resolved || {}
    };
}

MendelHashWalker.prototype._error = function(msg) {
    this.error = this.error || new Error(msg);
    this.error.code = "TRVRSL";
}

MendelHashWalker.prototype.found = function() {
    this._result = MendelWalker.prototype.found.call(this);

    if (!this.error && this._result.hash !== this.inputHash) {
        var e = new Error('Tree Hash Mismatch');
        e.code = 'HASHMISS';
        this.error = this.error;
    }

    return xtend(this._result, {
        error: this.error
    });
}

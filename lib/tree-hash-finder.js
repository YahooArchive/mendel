/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var deserialize = require('./tree-deserialiser');
var TreeSerialiser = require('./tree-serialiser');

function MendelHashBasedFinder(hash) {
    if (!(this instanceof MendelHashBasedFinder)) {
        return new MendelHashBasedFinder(module);
    }

    var result = deserialize(hash);

    this.hash = hash;
    this.error = result.error;
    this.decoded = result.decoded;
    this.deps = {};
    this.pathCount = 0;
    this.serialiser = new TreeSerialiser();
}

MendelHashBasedFinder.prototype.find = function(module) {
    if (this.error) return {};

    var resolved;
    var fileId = module.id;
    if (this.deps[fileId]) {
        return this.deps[fileId];
    } else if (module.variations.length === 1) {
        resolved = module.data[0];
        this.deps[fileId] = resolved;
    } else {
        if (this.pathCount >= this.decoded.branches.length) {
            this._error('Tree has more paths than hash');
        } else {
            var nextPath = this.decoded.branches[this.pathCount];
            resolved = module.data[nextPath];
            if (!resolved) {
                this._error('Hash branch not found in tree');
            }
            this.serialiser.pushBranch(nextPath);
        }
        this.pathCount++;
    }

    this.deps[fileId] = resolved;
    this.serialiser.pushFileHash(new Buffer(resolved.sha, 'hex'));
    return resolved || {};
}

MendelHashBasedFinder.prototype._error = function(msg) {
    this.error = new Error(msg);
    this.error.code = "TRVRSL";
}

MendelHashBasedFinder.prototype.found = function() {
    if (this._found) return this._found;

    var newHash = this.serialiser.result();
    if (newHash !== this.hash) {
        var e = new Error('Tree Hash Mismatch');
        e.code = 'HASHMISS';
        this.error = this.error || e;
    }

    this._found = {
        error: this.error,
        hash: newHash
    };
    if (!this.error) {
        this._found.deps = this.deps;
    }
    return this._found;
}

module.exports = MendelHashBasedFinder;

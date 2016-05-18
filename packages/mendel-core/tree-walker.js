/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var TreeSerialiser = require('./tree-serialiser');

function MendelWalker() {
    if (!(this instanceof MendelWalker)) {
        return new MendelWalker();
    }

    this.deps = [];
    this.serialiser = new TreeSerialiser();
}

MendelWalker.prototype.find = function(module) {
    var resolved;
    if (this.deps[module.index]) {
        return this.deps[module.index];
    } else if (module.data.length === 1) {
        resolved = module.data[0];
    } else {
        var branch = this._resolveBranch(module);
        resolved = branch.resolved;
        this.serialiser.pushBranch(branch.index);
    }
    this.deps[module.index] = resolved;
    this.serialiser.pushFileHash(new Buffer(resolved.sha, 'hex'));

    return resolved;
}

MendelWalker.prototype._resolveBranch = function() {
    throw new Error('You should extend and implement _resolveBranch');
}

MendelWalker.prototype.found = function() {
    return {
        deps: this.deps,
        hash: this.serialiser.result()
    };
}

module.exports = MendelWalker;

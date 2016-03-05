/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var TreeSerialiser = require('./tree-serialiser');

function MendelVariationFinder(lookupChains, base) {
    if (!(this instanceof MendelVariationFinder)) {
        return new MendelVariationFinder(module);
    }
    this.lookupChains = lookupChains;
    this.base = base;

    this.conflicts = 0;
    this.conflictList = {};
    this.deps = {};
    this.serialiser = new TreeSerialiser();
}

MendelVariationFinder.prototype.find = function(module) {
    var fileId = module.id;
    var resolved;
    if (this.deps[fileId]) {
        return this.deps[fileId];
    } else if (module.variations.length === 1) {
        resolved = module.data[0];
        this.deps[fileId] = resolved;
    } else {
        var foundIn = 0;
        var pathIndex = 0;
        for (var i = 0; i < this.lookupChains.length; i++) {
            for (var j = 0; j < this.lookupChains[i].length; j++) {
                var index = module.variations.indexOf(this.lookupChains[i][j]);
                if(-1 !== index) {
                    if (!foundIn) {
                        // keep first match, priority by .mendelrc entry order
                        resolved = module.data[index];
                        pathIndex = index;
                    }
                    if (!foundIn || this.lookupChains[i][j] !== this.base) {
                        // config.base don't cont as conflict
                        foundIn++;
                    }
                    break;
                }
            }
        }
        if (foundIn>1) {
            this.conflicts++;
            this.conflictList[fileId] = true;
        }
        this.serialiser.pushBranch(pathIndex);
    }
    this.deps[fileId] = resolved;
    this.serialiser.pushFileHash(resolved.sha);
    return resolved;
}

MendelVariationFinder.prototype.found = function() {
    return {
        conflicts: this.conflicts,
        conflictList: this.conflictList,
        deps: this.deps,
        hash: this.serialiser.result()
    };
}

module.exports = MendelVariationFinder;

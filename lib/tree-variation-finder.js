/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var util = require("util");
var xtend = require('xtend');

var MendelWalker = require('./walker');

util.inherits(MendelVariationWalker, MendelWalker)
module.exports = MendelVariationWalker;

function MendelVariationWalker(_lookupChains, _base) {
    if (!(this instanceof MendelVariationWalker)) {
        return new MendelVariationWalker(_lookupChains, _base);
    }
    MendelWalker.call(this);

    this._lookupChains = _lookupChains;
    this._base = _base;
    this.conflicts = 0;
    this.conflictList = {};
}

MendelVariationWalker.prototype._resolveBranch = function(module) {
    var fileId = module.id;
    var resolved;
    var foundIn = 0;
    var pathIndex = 0;
    for (var i = 0; i < this._lookupChains.length; i++) {
        for (var j = 0; j < this._lookupChains[i].length; j++) {
            var index = module.variations.indexOf(this._lookupChains[i][j]);
            if(-1 !== index) {
                if (!foundIn) {
                    // keep first match, priority by .mendelrc entry order
                    resolved = module.data[index];
                    pathIndex = index;
                }
                if (!foundIn || this._lookupChains[i][j] !== this._base) {
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
    return {
        index: pathIndex,
        resolved: resolved
    };
}

MendelVariationWalker.prototype.found = function() {
    return xtend(MendelWalker.prototype.found.call(this), {
        conflicts: this.conflicts,
        conflictList: this.conflictList
    });
}


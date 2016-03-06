/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');

var parseConfig = require('./config');
var parseVariations = require('./lib/variations');
var MendelVariationFinder = require('./lib/tree-variation-finder');
var MendelHashBasedFinder = require('./lib/tree-hash-finder');

function MendelTrees(opts) {
    if (!(this instanceof MendelTrees)) {
        return new MendelTrees(opts);
    }

    var config = parseConfig(opts.basedir);
    var variations = parseVariations(config);
    variations.push({
        'id': config.base,
        chain: [config.basetree]
    });

    this.config = config;
    this.variations = variations;
    this.opts = opts;
    this._loadBundles();
}

MendelTrees.prototype.findTreeForVariations = function(bundle, variations) {
    if (typeof variations ==='string') {
        variations = [variations];
    }

    var lookupChains = this._buildLookupChains(variations);
    var finder = new MendelVariationFinder(lookupChains, this.config.base);

    this._walkTree(bundle, finder);

    return finder.found();
}

MendelTrees.prototype.findTreeForHash = function(bundle, hash) {
    var finder = new MendelHashBasedFinder(hash);

    this._walkTree(bundle, finder);

    return finder.found();
}

MendelTrees.prototype._loadBundles = function() {
    var self = this;
    this.bundles = {};
    Object.keys(self.config.bundles).forEach(function(bundleId) {
        var bundlePath = path.join(
            self.config.basedir,
            self.config.dest,
            bundleId + '.manifest.json'
        );
        self.bundles[bundleId] = require(bundlePath);
    });
}

MendelTrees.prototype._walkTree = function(bundle, finder) {
    var tree = this.bundles[bundle];
    var entry = this.config.bundles[bundle].dest;
    var entryModule = tree.bundles[tree.indexes[entry]];
    walk(tree, entryModule, finder);
}

MendelTrees.prototype._buildLookupChains = function(lookFor) {
    var lookupChains = []; // perf: for loop instead of forEach
    for (var i = 0; i < this.variations.length; i++) {
        var variation = this.variations[i];
        if (-1 !== lookFor.indexOf(variation.id)) {
            var lookupChain = [];
            for (var j = 0; j < variation.chain.length; j++) {
                var lookupVar = variation.chain[j];
                if (lookupVar !== this.config.base) {
                    lookupChain.push(lookupVar);
                }
            }
            lookupChains.push(lookupChain);
        }
    }
    lookupChains.push([this.config.base]);
    return lookupChains;
}

function walk(tree, module, pathFinder) {
    var dep = pathFinder.find(module);
    // perf: no hasOwnProperty, it is a JSON, lets shave miliseconds
    for (var key in dep.deps) {
        var index = dep.deps[key];
        var subdep = tree.bundles[index];
        walk(tree, subdep, pathFinder);
    }
}


module.exports = MendelTrees;

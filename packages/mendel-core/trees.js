/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var xtend = require('xtend');

var parseConfig = require('mendel-config');
var parseVariations = require('mendel-config/variations');
var MendelVariationWalker = require('./tree-variation-walker');
var MendelServerVariationWalker = require('./tree-variation-walker-server');
var MendelHashWalker = require('./tree-hash-walker');

function MendelTrees(opts) {
    if (!(this instanceof MendelTrees)) {
        return new MendelTrees(opts);
    }

    var config = parseConfig(opts);
    var variations = parseVariations(config);
    variations.push({
        'id': config.base,
        chain: [config.basetree],
    });

    this.config = config;
    this.variations = variations;
    this._loadBundles();
}

MendelTrees.prototype.findTreeForVariations = function(bundle, lookupChains) {
    var finder = new MendelVariationWalker(lookupChains, this.config.base);

    this._walkTree(bundle, finder);

    return finder.found();
};

MendelTrees.prototype.findServerVariationMap = function(bundles, lookupChains) {
    var self = this;
    var variationMap = {};
    var base = self.config.base;
    var finder = new MendelServerVariationWalker(lookupChains, base);

    function selectBundles(key) {
        return bundles.indexOf(key) !== -1;
    }

    Object.keys(self.bundles).filter(selectBundles).forEach(function (bundle) {
        self._walkTree(bundle, finder);
        variationMap = xtend(variationMap, finder.found());
    });

    return variationMap;
};

MendelTrees.prototype.findTreeForHash = function(bundle, hash) {
    var finder = new MendelHashWalker(hash);

    this._walkTree(bundle, finder);

    return finder.found();
};

MendelTrees.prototype._loadBundles = function() {
    var self = this;
    this.bundles = {};
    var confBundles = self.config.bundles;
    confBundles.forEach(function(bundle) {
        var bundlePath = path.join(self.config.outdir, bundle.manifest);
        try {
            self.bundles[bundle.id] = require(path.resolve(bundlePath));
        } catch (error) {
            var newError = new Error();
            newError.code = error.code;
            if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ENOENT') {
                newError.message = 'Could not find "' + bundle.id
                                 + '" bundle at path '+ bundlePath;
            } else {
                newError.message = 'Invalid bundle file at path '+ bundle.manifest;
            }
            throw newError;
        }
    });
};

MendelTrees.prototype._walkTree = function(bundle, finder) {
    var tree = this.bundles[bundle];
    for (var i = 0; i < tree.bundles.length; i++) {
        var module = tree.bundles[i];
        if (module.entry || module.expose) {
            walk(tree, module, finder);
        }
    }
};

MendelTrees.prototype.variationsAndChains = function(lookFor) {
    var lookupChains = [];
    var matchingVariations = [];
    // perf: for loop instead of forEach
    for (var i = 0; i < this.variations.length; i++) {
        var variation = this.variations[i];
        if (-1 !== lookFor.indexOf(variation.id)) {
            matchingVariations.push(variation.id);
            var lookupChain = [];
            for (var j = 0; j < variation.chain.length; j++) {
                var lookupVar = variation.chain[j];
                if (lookupVar !== this.config.basetree) {
                    lookupChain.push(lookupVar);
                }
            }
            lookupChains.push(lookupChain);
        }
    }
    matchingVariations.push(this.config.base);
    lookupChains.push([this.config.basetree]);
    return {
        lookupChains: lookupChains,
        matchingVariations: matchingVariations,
    };
};

function walk(tree, module, pathFinder, _visited) {
    _visited = _visited || [];
    var dep = pathFinder.find(module);
    // perf: no hasOwnProperty, it is a JSON, lets shave miliseconds
    for (var key in dep.deps) {
        var index = tree.indexes[dep.deps[key]];
        var subdep = tree.bundles[index];
        if (subdep && !_visited[index]) {
            _visited[index] = true; // avoids infinite loop in circular deps
            walk(tree, subdep, pathFinder, _visited);
        }
    }
}


module.exports = MendelTrees;

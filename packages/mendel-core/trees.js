/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');

var parseConfig = require('mendel-config');
var MendelVariationWalker = require('./tree-variation-walker');
var MendelServerVariationWalker = require('./tree-variation-walker-server');
var MendelHashWalker = require('./tree-hash-walker');

function MendelTrees(opts) {
    if (!(this instanceof MendelTrees)) {
        return new MendelTrees(opts);
    }

    var config = parseConfig(opts);

    this.config = config;
    this.variations = config.variationConfig.variations;
    this._loadBundles();

    this.ssrOutlet = this.config.outlets.find(outletConfig => {
        return outletConfig._plugin === 'mendel-outlet-server-side-render';
    });
    this.ssrBundle = this.config.bundles.find(bundleConfig => {
        return bundleConfig.outlet === this.ssrOutlet.id;
    });
}

MendelTrees.prototype.findTreeForVariations = function(bundle, lookupChains) {
    var finder = new MendelVariationWalker(lookupChains, this.config.baseConfig.id);

    this._walkTree(bundle, finder);

    return finder.found();
};

MendelTrees.prototype.findServerVariationMap = function(bundles, lookupChains) {
    if (!this.ssrBundle)
        throw new Error([
            'For a server-side render, you must use',
            '"mendel-outlet-server-side-render"',
        ].join(' '));

    var base = this.config.baseConfig.dir;
    var finder = new MendelServerVariationWalker(lookupChains, base);
    this._walkTree(this.ssrBundle.id, finder);
    const variationMap = finder.found();
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

    confBundles
    .filter(bundle => bundle.manifest)
    .forEach(function(bundle) {
        var bundlePath = bundle.manifest;
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
    matchingVariations.push(this.config.baseConfig.id);
    lookupChains.push([this.config.baseConfig.dir]);
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

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');

module.exports = function(config) {
    var projectRoot = config.projectRoot || config.basedir || process.cwd();

    var variationConfig = config.variationConfig || {};
    var variations = config.variations || variationConfig.variations || {};
    var baseVariationDir = config.basetree || config.base;

    if (config.variationConfig) {
        var dirs = [].concat(variationConfig.variationDirs).filter(Boolean);
        baseVariationDir = config.baseConfig.dir;
        return dirs.reduce(function(allVariations, dir) {
            return allVariations.concat(variationsForDir(variations, dir));
        }, []);
    } else {
        // legacy
        var dir = config.variationsdir || config.vasriations_root || "";
        return variationsForDir(variations, dir);
    }

    function variationsForDir(vars, variationRoot) {
        return Object.keys(vars).map(function(varId) {
            if(varId === '_') return;
            if (Array.isArray(vars[varId] && vars[varId]._)) {
                vars[varId] = vars[varId]._;
            }

            var chain = [varId]
                        .concat(Array.isArray(vars[varId]) ? vars[varId] : [])
                        .map(relativeRoot)
                        .filter(existsInProjectRoot);

            return {
                id: varId,
                dir: path.join(variationRoot, (vars[varId] || [varId])[0]),
                chain: chain.concat(baseVariationDir || projectRoot),
            };
        }).filter(function(variation) {
            return variation
                // we add base automatically, user can't add base on .mendelrc
                && variation.id !== 'base'
                && variation.chain.length > 1;
        });

        function relativeRoot(dir) {
            return path.join(variationRoot, dir);
        }

    }

    function existsInProjectRoot(dir) {
        return fs.existsSync(path.join(projectRoot, dir));
    }
};

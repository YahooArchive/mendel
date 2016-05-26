/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');

module.exports = function(config) {
    var basedir = config.basedir || process.cwd();
    var root = config.variationsdir || config.vasriations_root || "";
    var vars = config.variations || {};

    var variations = Object.keys(vars).map(function(dir) {
        if(dir === '_') return;
        if (Array.isArray(vars[dir] && vars[dir]._)) {
            vars[dir] = vars[dir]._;
        }

        var chain = [dir]
                    .concat(Array.isArray(vars[dir]) ? vars[dir] : [])
                    .map(relativeRoot)
                    .filter(existsInBasedir);

        return {
            id: dir,
            chain: chain.concat(config.basetree || config.base || basedir),
        };
    }).filter(function(variation) {
        return variation
            && variation.id !== 'base'
            && variation.chain.length > 1;
    });

    function relativeRoot(dir) {
        return path.join(root, dir);
    }

    function existsInBasedir(dir) {
        return fs.existsSync(path.join(basedir, dir));
    }

    return variations;
}


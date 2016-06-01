/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = variationMatches;
function variationMatches(variations, path) {
    var result;
    variations.some(function(variation) {
        return variation.chain.some(function(dir) {
            var parts = path.split(new RegExp("/"+dir+"/"));
            var found = parts.length > 1;
            if (found) result = {
                variation: variation,
                dir: dir,
                file: parts[parts.length-1],
            };
            return found;
        });
    });
    return result;
}

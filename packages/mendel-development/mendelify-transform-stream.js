/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var shasum = require('shasum');
var through = require('through2');
var variationMatches = require('./variation-matches');
var mendelifyRequireTransform = require('./mendelify-require-transform');

function mendelifyTransformStream(variations) {
    return through.obj(function mendelify(row, enc, next) {
        var match = variationMatches(variations, row.file);
        if (match) {
            row.id = match.file;
            row.variation = match.dir;
        }

        Object.keys(row.deps).forEach(function (key) {
            var depMatch = variationMatches(variations, key);
            if (depMatch) {
                row.deps[depMatch.file] = depMatch.file;
                delete row.deps[key];
            }
        });


        row.rawSource = row.source;
        row.source = mendelifyRequireTransform(row.file, row.source, variations);
        row.sha = shasum(row.source);

        this.push(row);
        next();
    });
}

module.exports = mendelifyTransformStream;

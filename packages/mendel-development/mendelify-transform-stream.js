/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var shasum = require('shasum');
var through = require('through2');
var variationMatches = require('./variation-matches');
var mendelifyRequireTransform = require('./mendelify-require-transform');

function mendelifyTransformStream(variations, expose) {
    return through.obj(function mendelify(row, enc, next) {
        if (!avoidMendelify(row.file)) {
            var match = variationMatches(variations, row.file);
            if (match) {
                row.id = match.file;
                row.variation = match.dir;
            }
        }

        Object.keys(row.deps).forEach(function (key) {
            if (!avoidMendelify(row.deps[key])) {
                var value = row.deps[key];
                delete row.deps[key];

                var newKey = pathOrVariationMatch(key, variations);
                var newValue = depsValue(value, variations, expose);
                row.deps[newKey] = newValue;
            }
        });

        row.rawSource = row.source;
        if (!avoidMendelify(row.file)) {
            row.source = mendelifyRequireTransform(row.file, row.source, variations);
        }
        row.sha = shasum(row.source);

        this.push(row);
        next();
    });
}

function avoidMendelify(file) {
    var isExternal = file === false;
    var isNodeModule = -1 !== (file||'').indexOf("node_modules");

    return isExternal || isNodeModule;
}

function pathOrVariationMatch(path, variations) {
    var match = variationMatches(variations, path);
    if (match) {
        return match.file;
    }
    return path;
}

function depsValue(path, variations, expose) {
    var exposedModule = exposeKey(expose, path);
    if (exposedModule) {
        return exposedModule;
    }
    return pathOrVariationMatch(path, variations);
}

function exposeKey(expose, file) {
    var exposedModule = false;
    Object.keys(expose).forEach(function(key) {
        var value = expose[key];
        if (file === value) {
            exposedModule = key;
        }
    });
    return exposedModule;
}

module.exports = mendelifyTransformStream;

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var nodePath = require('path');
var shasum = require('shasum');
var through = require('through2');
var variationMatches = require('./variation-matches');
var mendelifyRequireTransform = require('./mendelify-require-transform');

function mendelifyTransformStream(variations, bundle) {
    var externals = bundle._external;
    return through.obj(function mendelify(row, enc, next) {
        var avoidMendelifyRow = avoidMendelify(row.file);
        if (!avoidMendelifyRow) {
            var match = variationMatches(variations, row.file);
            if (match) {
                // Remove variations of externals from bundle
                if (someArrayItemEndsWith(externals, match.file)) {
                    return next();
                }
                // accept file and trasform for variation
                row.id = match.file;
                row.variation = match.dir;
            }
        }

        row.id = relativePath(row.id, bundle);

        if (typeof row.expose === 'string') {
            row.expose = relativePath(
                pathOrVariationMatch(row.expose, variations),
                bundle
            );
        }

        Object.keys(row.deps).forEach(function (key) {
            var value = row.deps[key];
            delete row.deps[key];

            var newKey = key;
            var newValue = value;

            if (!avoidMendelify(value) || shouldExternalize(externals, key)) {
                newKey = pathOrVariationMatch(key, variations);
            }

            newValue = depsValue(value, newKey, variations, bundle);
            row.deps[newKey] = relativePath(newValue, bundle);
        });

        row.rawSource = row.source;
        if (!avoidMendelifyRow) {
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

function relativePath(filePath, bundle) {
    var basedir = bundle._options.basedir;
    var result = filePath;
    if (typeof filePath === 'string' && filePath.indexOf(basedir) !== -1) {
        result = nodePath.relative(basedir, filePath);
    }
    return relativeToNodeModules(result);
}

function relativeToNodeModules(filePath) {
    if (typeof filePath === 'string') {
        var index = filePath.indexOf('node_modules/');
        if (index >= 0) {
            return filePath.slice(index);
        }
    }
    return filePath;
}

function depsValue(path, matchFile, variations, bundle) {
    if (typeof path !== 'string') {
        return path;
    }
    var expose = bundle._expose;
    var externals = bundle._external;

    var exposedModule = exposeKey(expose, path);
    if (exposedModule) {
        return pathOrVariationMatch(exposedModule, variations);
    }

    // remove externals from deps
    if (shouldExternalize(externals, matchFile)) {
        return false;
    }

    return pathOrVariationMatch(path, variations);
}

function shouldExternalize(externals, file) {
    return someArrayItemEndsWith(externals, file);
}

function someArrayItemEndsWith(stringArray, partialString) {
    for (var i = 0; i < stringArray.length; i++) {
        var position = stringArray[i].indexOf(partialString);
        if (
            position >= 0 &&
            position === stringArray[i].length - partialString.length
        ) {
            return true;
        }
    }
    return false;
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

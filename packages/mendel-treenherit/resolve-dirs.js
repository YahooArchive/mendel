/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var async = require('async');
var resolve = require('browser-resolve');

module.exports = resolveInDirs;

function resolveInDirs(file, dirs, base, parent, callback) {
    base = base || process.cwd();
    parent = parent || './index.js';

    var finalPath, lastError;
    async.detectSeries(dirs, function(dir, doneModule) {
        var parentInsideIterateeDir = path.join(base, dir, parent);
        var opts = {
            filename: parentInsideIterateeDir,
            extensions: [ ".js", ".coffee", ".coffee.md", ".litcoffee",
                            ".jsx", ".es", ".es6"],
        };
        resolve(file, opts, function(err, path) {
            if (!err) {
                finalPath = path;
            }
            lastError = err;
            doneModule(!err);
        });
    }, function(moduleIn) {
        if (!moduleIn) {
            return callback(lastError);
        }
        return callback(lastError, finalPath);
    });
}

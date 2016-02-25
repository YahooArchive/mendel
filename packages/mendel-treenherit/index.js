/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var async = require('async');
var resolve = require('browser-resolve');
var transformTools = require('browserify-transform-tools');

        /*  CLI USAGE:
            browserify src/A/main.js \
                    -o build/A_main.js \
                    -t [ mandel-treenherit --dirs [ A/ B/ ] ]
        */

        /*  ALGORITHM:
            Let's assume the following input directory chain:
                dirs = ["B/","A/"]
            And the following files exist:
                /A/lib/foo.js
                /A/lib/bar.js
                /B/lib/bar.js
            And /A/lib/foo.js has a statement:
                var bar = require('./bar');

            browser-resolve (same module used by browserify) finds dependencies with
            relative path by looking at the parent path.

            For this reason, if a "parent" file from /A/ requires a relative file that
            should resolve on /B/, we need to simulate that the original file is on /B/

            As per example:
                resolve('./bar', {filename:'/A/lib/foo.js'}) //--> /A/lib/bar.js
                resolve('./bar', {filename:'/B/lib/foo.js'}) //--> /B/lib/bar.js
        */

var requireTransform = transformTools.makeRequireTransform(
    "requireTransform",
    {evaluateArguments: true},
    function(args, opts, requireDone) {
        var parent = opts.file;
        var module = args[0];

        var dirs = opts.config.dirs || [];
        if (dirs._) { // CLI compatibility
            dirs = dirs._;
        }
        if (typeof dirs === 'string') {
            dirs = [dirs];
        }
        if (isExternalModule(module) || !dirs.length) {
            return requireDone();
        }

        // removes all folder information, per example /User/code/project/A/lib/foo.js -> lib/foo.js
        dirs.forEach(function(dir) {
            parent = parent.replace(new RegExp(".*?"+dir), '');
        });

        // Look for the parent file on each directory. Array order matters
        async.detectSeries(dirs, function(dir, doneParent) {
            var targetFile = path.join(process.cwd(), dir, parent);
            fs.stat(targetFile, function(err) {
                doneParent(!err);
            });
        }, function(parentIn) {
            if (!parentIn) {
                return requireDone();
            }
            // console.log('parent found in', parentIn, parent); // per example above, parentIn = /A/
            var finalPath;
            async.detectSeries(dirs, function(dir, doneModule) {
                var parentInsideIterateeDir = path.join(process.cwd(), dir, parent);
                resolve(module, {filename: parentInsideIterateeDir}, function(err, path) {
                    if (!err) {
                        finalPath = path;
                    }
                    doneModule(!err);
                });
            }, function(moduleIn) {
                if (!moduleIn) {
                    return requireDone();
                }
                // console.log('module found in', moduleIn, module); // per example above, moduleIn = /B/
                return requireDone(null, "require('"+finalPath+"')");
            });
        });
    }
);

function isExternalModule (file) {
    var regexp = process.platform === 'win32' ?
        /^(\.|\w:)/ :
        /^[\/.]/;
    return !regexp.test(file);
}

module.exports = requireTransform;

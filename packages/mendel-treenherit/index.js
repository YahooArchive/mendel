/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

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

            browser-resolve (same module used by browserify) finds dependencies
            with relative path by looking at the parent path.

            For this reason, if a "parent" file from /A/ requires a relative
            file that should resolve on /B/, we need to simulate that the
            original file is on /B/

            As per example:
                resolve('./bar', {filename:'/A/lib/foo.js'}) //--> /A/lib/bar.js
                resolve('./bar', {filename:'/B/lib/foo.js'}) //--> /B/lib/bar.js
        */

var requireTransform = transformTools.makeRequireTransform(
    "treenherit",
    {evaluateArguments: true},
    function(args, opts, transformDone) {
        var parent = opts.file;
        var module = args[0];
        var basedir = opts.config._flags && opts.config._flags.basedir;

        var dirs = opts.config.dirs || [];
        if (dirs._) { // CLI compatibility
            dirs = dirs._;
        }
        if (typeof dirs === 'string') {
            dirs = [dirs];
        }
        if (isExternalModule(module) || !dirs.length) {
            return transformDone();
        }

        // removes all folder information,
        // per example /User/code/project/A/lib/foo.js -> lib/foo.js
        dirs.some(function(dir) {
            var parts = parent.split(new RegExp("/"+dir+"/"));
            var found = parts.length > 1;
            if (found) {
                // basedir = basedir || parts[0];
                parent = parts[1];
            }
            return found;
        });

        var finalPath;
        async.detectSeries(dirs, function(dir, doneModule) {
            var base = basedir || process.cwd();
            var parentInsideIterateeDir = path.join(base, dir, parent);
            var opts = { filename: parentInsideIterateeDir };
            resolve(module, opts, function(err, path) {
                if (!err) {
                    finalPath = path;
                }
                doneModule(!err);
            });
        }, function(moduleIn) {
            if (!moduleIn) {
                return transformDone();
            }
            // finalPath **MUST** be absolute because generating multiple
            // bundles from the same tree but different entrypoints
            // will cause checksum to fail
            finalPath = path.resolve(finalPath);
            return transformDone(null, "require('"+finalPath+"')");
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

/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs-extra');
var path = require('path');
var through = require('through2');
var mendelRequireTransform = require('mendel-development/require-transform');
var variationMatches = require('mendel-development/variation-matches');

function requirify(b, opts) {
    var outdir = opts.outdir || path.join(process.cwd(), 'mendel-requirify');
    var dirs = opts.dirs || (b.variation && b.variation.chain) || [];

    function addHooks() {
        b.pipeline.get('label').push(through.obj(function(row, enc, next) {
            var that = this;

            function done() {
                that.push(row);
                next();
            }

            var file = row.file || row.id;
            var nm = file.split('/node_modules/')[1];

            if (nm) {
                // ignore node_modules
                return done();
            }

            var match = variationMatches([{chain: dirs}], file);

            if (match) {
                var dest = path.join(outdir, match.dir, match.file);
                var out = fs.createOutputStream(dest);
                var src = row.rawSource || row.source;
                out.end(mendelRequireTransform(dest, src, dirs, true));
            }
            done();
        }));
    }

    b.on('reset', addHooks);
    addHooks();
}

module.exports = requirify;

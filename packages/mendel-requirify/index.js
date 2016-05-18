/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs-extra');
var path = require('path');
var through = require('through2');
var mendelRequireTransform = require('mendel-development/require-transform');

function requirify(b, opts) {
    var outdir = opts.outdir || path.join(process.cwd(), 'mendel-requirify');

    function addHooks() {
        b.pipeline.get('dedupe').push(through.obj(function(row, enc, next) {
            var that = this;

            function done() {
                that.push(row);
                next();
            }

            if (!row.variation) {
                // mendelify did now find a match,
                // i.e. file is outside base or variation dirs, skipping.
                return done();
            }

            var file = row.file || row.id;
            var nm = file.split('/node_modules/')[1];

            if (nm) {
                // ignore node_modules
                return done();
            }

            var dest = path.join(outdir, row.variation, row.id);
            var out = fs.createOutputStream(dest);
            out.write(mendelRequireTransform(row.source, true));
            out.end(done);
        }));
    }

    b.on('reset', addHooks);
    addHooks();
}

module.exports = requirify;

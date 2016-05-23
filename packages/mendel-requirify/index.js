/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs-extra');
var path = require('path');
var through = require('through2');
var mendelRequireTransform = require('mendel-development/require-transform');

function requirify(b, opts) {
    var outdir = opts.outdir || path.join(process.cwd(), 'mendel-requirify');
    var writeCache = opts.writeCache || {};

    function addHooks() {
        var start = null;
        var pending = 0;

        b.pipeline.get('dedupe').push(through.obj(function(row, enc, next) {
            if (!start) {
                start = process.hrtime();
            }
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

            if (writeCache[file]) {
                return done();
            }

            var nm = file.split('/node_modules/')[1];

            if (nm) {
                // ignore node_modules
                return done();
            }

            writeCache[file] = true;
            pending++;

            var dest = path.join(outdir, row.variation, row.id);
            var out = fs.createOutputStream(dest);
            out.end(mendelRequireTransform(row.source, true), writeDone);

            done();
        }));

        b.on('update', function(files) {
            files.forEach(invalidate);
        });

        function writeDone() {
            pending--;
            if (pending === 0) {
                var diff = process.hrtime(start);
                var timeMillis = Math.floor(diff[0] * 1e3 + diff[1] * 1e-6);
                b.emit('mendel-requirify:finish', timeMillis);
            }
        }
    }

    function invalidate(file) {
        delete writeCache[file];
    }

    b.on('reset', addHooks);
    addHooks();
}

module.exports = requirify;

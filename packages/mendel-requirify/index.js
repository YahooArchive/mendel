/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs-extra');
var path = require('path');
var through = require('through2');
var mendelRequireTransform = require('./lib/mendel-require-transform');

function requirify(b, opts) {
    var outdir = opts.outdir || path.join(process.cwd(), 'mendel-requirefy');

    b.pipeline.get('dedupe').push(through.obj(function(row, enc, next) {
        var file = row.file || row.id;
        var nm = file.split('/node_modules/')[1];
        if (!nm) {
            var dest = path.join(outdir, row.variation, row.id);
            var out = fs.createOutputStream(dest);
            out.write(mendelRequireTransform(row.source, true));
            out.end();
        }
        this.push(row);
        next();
    }));

}

module.exports = requirify;

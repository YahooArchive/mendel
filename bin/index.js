#!/usr/bin/env node
/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var browserify = require('browserify');
var fs = require('fs');
var mkdirp = require('mkdirp');
var glob = require('glob');
var xtend = require('xtend');
var path = require('path');
var async = require('async');

var parseConfig = require('../lib/config');

var config = parseConfig();
logObj(config);

var outdir = config.bundlesoutdir || config.outdir;
mkdirp.sync(outdir);

async.each(config.bundles, function(rawBundle, doneBundle) {
    var bundle = JSON.parse(JSON.stringify(rawBundle));
    var conf = {
        basedir: config.basedir,
        outfile: path.join(bundle.bundlesoutdir, config.base, bundle.outfile)
    };
    mkdirp.sync(path.dirname(conf.outfile));

    var entries = bundle.entries;
    delete bundle.entries;

    var b = browserify(xtend(conf, bundle));
    b.plugin(path.join(__dirname, '../packages/mendel-browserify'), bundle);

    [].concat(bundle.ignore).filter(Boolean)
        .forEach(function (i) {
            b._pending ++;
            glob(i, function (err, files) {
                if (err) return b.emit('error', err);
                if (files.length === 0) {
                  b.ignore(i);
                }
                else {
                  files.forEach(function (file) { b.ignore(file) });
                }
                if (--b._pending === 0) b.emit('_ready');
            });
        })
    ;

    [].concat(bundle.exclude).filter(Boolean)
        .forEach(function (u) {
            b.exclude(u);

            b._pending ++;
            glob(u, function (err, files) {
                if (err) return b.emit('error', err);
                files.forEach(function (file) { b.exclude(file) });
                if (--b._pending === 0) b.emit('_ready');
            });
        })
    ;

    [].concat(bundle.external).filter(Boolean)
        .forEach(function (x) {
            var xs = splitOnColon(x);
            if (xs.length === 2) {
                add(xs[0], { expose: xs[1] });
            }
            else if (/\*/.test(x)) {
                b.external(x);
                b._pending ++;
                glob(x, function (err, files) {
                    files.forEach(function (file) {
                        add(file, {});
                    });
                    if (--b._pending === 0) b.emit('_ready');
                });
            }
            else add(x, {});

            function add (x, opts) {
                if (/^[\/.]/.test(x)) b.external(path.resolve(x), opts)
                else b.external(x, opts)
            }
        })
    ;

    if (entries) {
        // TODO: aync ../lib/resolve-dirs instead of hardcoded base
        entries.forEach(function(entry) {
            b.add(path.join(config.basedir, config.basetree, entry));
        });
    }

    var finalBundle = b.bundle();
    finalBundle.on('end', doneBundle);
    if (conf.outfile) {
        finalBundle.pipe(fs.createWriteStream(conf.outfile));
    } else {
        finalBundle.pipe(process.stdout);
    }
});

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}

function splitOnColon (f) {
    var pos = f.lastIndexOf(':');
    if (pos == -1) {
        return [f]; // No colon
    } else {
        if ((/[a-zA-Z]:[\\/]/.test(f)) && (pos == 1)){
            return [f]; // Windows path and colon is part of drive name
        } else {
            return [f.substr(0, pos), f.substr(pos + 1)];
        }
    }
}

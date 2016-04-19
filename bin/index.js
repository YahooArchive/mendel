#!/usr/bin/env node
/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var browserify = require('browserify');
var glob = require('glob');
var xtend = require('xtend');
var path = require('path');
var async = require('async');

var parseConfig = require('../lib/config');

var config = parseConfig();
logObj(config);

var bundles = Object.keys(config.bundles).map(function(bundleName) {
  var bundle = config.bundles[bundleName];
  bundle.id = bundleName;
  return bundle;
});

logObj(bundles);

async.each(bundles, function(rawBundle, doneBundle) {
    var bundle = JSON.parse(JSON.stringify(rawBundle));

    // TODO: This is probably a bad idea, hand picking is probably better
    bundle = xtend(config, bundle);

    delete bundle.entries;
    bundle.outfile = bundle.id + '.js';

    var b = browserify(bundle);

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

    b.plugin(path.join(__dirname, '../packages/mendel-browserify'), config);

    if (rawBundle.entries) {
        // TODO: aync ../lib/resolve-dirs instead of hardcoded base
        rawBundle.entries.forEach(function(entry) {
            b.add(path.join(config.basedir, config.basetree, entry));
        });
    }

    var finalBundle = b.bundle();
    finalBundle.on('end', doneBundle);
    finalBundle.pipe(process.stdout);
}, function() {
    console.log('all done');
});

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}

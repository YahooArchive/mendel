/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var browserify = require('browserify');
var debug = require('debug')('mendel-runner-bundle');

var applyExtraOptions = require('mendel-development/apply-extra-options');
var mendelBrowserify = require('mendel-browserify');
var mendelRequirify = require('mendel-requirify');

function mendelBundle(mendelConfig, bundleConfig, doneBundle) {
    var entries = bundleConfig.entries;
    var requires = bundleConfig.require;
    delete bundleConfig.entries;
    delete bundleConfig.require;

    var b = browserify(bundleConfig);

    b.plugin(mendelBrowserify, mendelConfig);

    if (mendelConfig.serveroutdir) {
        b.plugin(mendelRequirify, {
            outdir: mendelConfig.serveroutdir
        });
    }

    // need to add/require files only after mendelBrowserify/mendelRequirify
    [].concat(entries).filter(Boolean).forEach(function (file) {
        b.add(file, { basedir: bundleConfig.basedir });
        debug(bundleConfig.bundleName + ' entry ' + file);
    });

    [].concat(requires).filter(Boolean).forEach(function (file) {
        b.require(file, { basedir: bundleConfig.basedir });
        debug(bundleConfig.bundleName + ' require ' + file);
    });

    // need to applyExtraOptions only after mendelBrowserify/mendelRequirify
    applyExtraOptions(b, bundleConfig);

    b.on('manifest', doneBundle);

    var bundleStream = b.bundle();
    if (bundleConfig.outfile) {
        bundleStream.pipe(fs.createWriteStream(bundleConfig.outfile));
    } else {
        bundleStream.pipe(process.stdout);
    }
}

module.exports = mendelBundle;

#!/usr/bin/env node
/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var browserify = require('browserify');
var fs = require('fs');
var mkdirp = require('mkdirp');
var xtend = require('xtend');
var path = require('path');
var async = require('async');

var parseConfig = require('mendel-config');
var applyExtraOptions = require('mendel-development/apply-extra-options');
var mendelBrowserify = require('mendel-browserify');
var mendelRequirify = require('mendel-requirify');

var postProcessManifests = require('./post-process-manifest');

var debug = process.argv.some(function(arg) {
    return /--verbose/.test(arg);
});

var rawConfig = parseConfig();

var outdir = rawConfig.bundlesoutdir || rawConfig.outdir;
mkdirp.sync(outdir);

var config = ['basedir','outdir','bundlesoutdir','serveroutdir',
    'base','basetree','variationsroute','hashroute',
    'variationsdir','variations'].reduce(function(cfg, key) {
        cfg[key] = rawConfig[key];
        return cfg;
    }, {
        config: false,
    });

if(debug) {
    rawConfig.verbose = true;
    config.verbose = true;
    console.log('mendel parsed config');
    logObj(config);
}

async.each(rawConfig.bundles, function(rawBundle, doneBundle) {
    var bundle = JSON.parse(JSON.stringify(rawBundle));
    var conf = {
        basedir: config.basedir,
        outfile: path.join(
            config.bundlesoutdir, config.base, bundle.bundleName + '.js'
        )
    };

    mkdirp.sync(path.dirname(conf.outfile));

    var entries = normalizeEntries(bundle.entries);
    delete bundle.entries;
    var requires = bundle.require;
    delete bundle.require;

    var b = browserify(xtend(conf, bundle));
    b.plugin(mendelBrowserify, config);

    if (config.serveroutdir) {
        b.plugin(mendelRequirify, {
            outdir: config.serveroutdir
        });
    }

    // those need to be called after mendelBrowserify was added
    [].concat(entries).filter(Boolean).forEach(function (file) {
        b.add(file, { basedir: conf.basedir });
    });

    [].concat(requires).filter(Boolean).forEach(function (file) {
        b.require(file, { basedir: conf.basedir });
    });

    applyExtraOptions(b, bundle);

    b.on('manifest', doneBundle);

    var finalBundle = b.bundle();
    if (conf.outfile) {
        finalBundle.pipe(fs.createWriteStream(conf.outfile));
    } else {
        finalBundle.pipe(process.stdout);
    }
}, function() {
    if (Array.isArray(rawConfig.manifestProcessors)) {
        postProcessManifests(rawConfig);
    }
});

function normalizeEntries(entries) {
    return [].concat(entries).filter(Boolean)
    .map(function(entry) {
        if (typeof entry === 'string') {
            if(!fs.existsSync(path.join(config.basedir, entry))) {
                var messages = [
                    '[warn] paths relative to variation are deprecated',
                    'you can fix this by changing',
                    entry,
                    'in your configuration'
                ];
                console.log(messages.join(' '));
                entry = path.join(config.basedir, config.basetree, entry);
            }
        }
        return entry;
    });
}

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}

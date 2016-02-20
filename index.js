/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var browserify = require('browserify');
var through = require('through2');
var shasum = require('shasum');
var path = require('path');
var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');
var JSONStream = require('JSONStream');

function existsRelativeDir(dir) {
  return fs.existsSync(path.join(process.cwd(), dir));
}

function variationsDir(dir) {
  return path.join(config.variations_root, dir);
}

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}

var config = require('./config')();
// logObj((config));

var basePath = path.join(process.cwd(), config.base);
if (!fs.existsSync(basePath)) {
  console.log('base must exist in config');
  process.exit(1);
}

var variations = Object.keys(config.variations).map(function(dir) {
  var chain = [dir]
                  .concat(config.variations[dir] || [])
                  .map(variationsDir)
                  .concat([config.base])
                  .filter(existsRelativeDir);
  return {
    id: dir,
    chain: chain,
  };
}).filter(function(variation) {
  return variation.id !== 'base' && variation.chain.length > 1;
});

// logObj(variations);

var bundles = [{
  id: 'base',
  chain: [config.base],
}].concat(variations).reduce(function(cumulative, variation) {
  var bundles = Object.keys(config.bundles).map(function(bundleName) {
    bundle = JSON.parse(JSON.stringify(config.bundles[bundleName]));
    bundle.entries = bundle.entries.map(function(file) {
      var found;
      variation.chain.some(function(dir) {
        found = path.join(dir, file);
        return fs.existsSync(found);
      });
      return found;
    });
    bundle.id = variation.id + '.' + bundleName;
    bundle.chain = variation.chain;
    bundle.dest = path.join(config.dest, variation.id, bundle.dest);
    return bundle;
  });
  return cumulative.concat(bundles);
}, []);

logObj(bundles);

async.parallel(bundles.map(function(bundle) { return function() {
  // var bundle = bundles[0];
  var b = browserify(bundle);

  b.transform("babelify");
  b.transform(path.join(__dirname, "packages/mendel-treenherit"), {"dirs": bundle.chain});

  var hasher = through.obj(function (row, enc, next) {
    row.sha = shasum(row.source);
    this.push(row);
    next();
  });
  b.pipeline.get('deps').push(hasher);

  // prepare to write deps file
  var destDeps = path.join(process.cwd(), config.dest, bundle.id+'.json');
  var depsString = JSONStream.stringify();
  mkdirp.sync(path.dirname(destDeps));
  depsString.pipe(fs.createWriteStream(destDeps));
  // create deps writer
  var depsWriter = through.obj(function (row, enc, next) {
    depsString.write(row);
    this.push(row);
    next();
  });
  b.pipeline.get('dedupe').push(depsWriter);

  // prepare to bundle
  var dest = path.join(process.cwd(), bundle.dest);
  mkdirp.sync(path.dirname(dest));
  // bundle
  b.bundle().pipe(fs.createWriteStream(dest));
};}));

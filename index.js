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
var xtend = require('xtend');
var falafel = require('falafel');

var validVariations = require('./lib/variations');
var variationMatches = require('./lib/variation-matches');
var config = require('./config')();
logObj((config));

var basePath = path.join(process.cwd(), config.base);
if (!fs.existsSync(basePath)) {
  console.log('base must exist in config');
  process.exit(1);
}

var bundles = Object.keys(config.bundles).map(function(bundleName) {
  var bundle = config.bundles[bundleName];
  bundle.id = bundleName;
  return bundle;
});

logObj(bundles);

var variations = validVariations(xtend(config, {
  basetree: config.base,
}));

variations.unshift({
  id: 'base',
  chain: [config.base],
});

logObj(variations);

var extractions = {};
bundles.forEach(function(bundle) {
  if (!bundle.extract) return;
  extractions[bundle.id] = Object.keys(bundle.extract).reduce(function(cumulative, key) {
    return cumulative.concat(bundle.extract[key].require);
  }, []);
});

logObj(extractions);

async.each(bundles, function(rawBundle, doneBundle) {
  var bundleIndexes = {};
  var bundleData = [];
  var bundleManifest = {
    bundleIndexes: bundleIndexes,
    bundles: bundleData,
  };

  function pushBundleManifest(dep) {
    var id = dep.id;
    var variation = dep.variation || 'module';
    var data = JSON.parse(JSON.stringify(dep));

    delete data.file;
    delete data.source;
    delete data.id;

    Object.keys(data.deps).forEach(function(key) {
      var index = bundleIndexes[key];
      if (typeof index !== 'undefined') {
        data.deps[key] = index;
      }
      index = bundleIndexes[data.deps[key]];
      if (typeof index !== 'undefined') {
        data.deps[key] = index;
      }
    });

    if (typeof bundleIndexes[id] === 'undefined') {
      var newDep = {
        id: id,
        variations: [variation],
        data: [data],
      };
      bundleData.push(newDep);
      bundleIndexes[id] = bundleData.indexOf(newDep);
    } else {
      var existingData = bundleData[bundleIndexes[id]];
      var variationIndex = existingData.variations.indexOf(variation);
      if (variationIndex === -1) {
        existingData.variations.push(variation);
        existingData.data.push(data);
      } else if (existingData.data[variationIndex].sha !== dep.sha) {
        throw new Error('Files with same variation ('+variation+') and id ('+id+') should have the same SHA');
      }
    }
  }

  async.each(variations, function(variation, doneVariation) {
    var bundle = JSON.parse(JSON.stringify(rawBundle));

    // validate entries honorring chain
    bundle.entries = (bundle.entries||[]).map(function(file) {
      var found;
      variation.chain.some(function(dir) {
        found = path.join(dir, file);
        return fs.existsSync(found);
      });
      return found;
    });
    bundle.bundleExternal = !bundle.external;

    // This is undocumented on browserify, but browserify
    // pass all options to modules-deps and filter is supported
    // and documented there.
    if (bundle.extract) {
      bundle.filter = function(id) {
        var found = variationMatches(variations, id);
        if (found) {
          return -1 === extractions[bundle.id].indexOf(found.file);
        }
        return true;
      };
    }


    var b = browserify(bundle);

    // Prepare output files
    var bundleFileName = (bundle.dest || bundle.id+'.js');
    var destDir = path.join(process.cwd(), config.dest, variation.id);
    var destBundle = path.join(destDir, bundleFileName);
    var destDeps = path.join(destDir, bundle.id+'.manifest.json');
    mkdirp.sync(destDir);

    var bundleStream = fs.createWriteStream(destBundle);
    var depsStream = JSONStream.stringify();
    depsStream.pipe(fs.createWriteStream(destDeps));

    b.transform(path.join(__dirname, "packages/mendel-treenherit"), {"dirs": variation.chain});

    var mendelify = through.obj(function (row, enc, next) {
      var match = variationMatches(variations, row.file);
      if (match) {
        row.id = match.file;
        row.variation = match.dir;
      }

      Object.keys(row.deps).forEach(function (key) {
        var depMatch = variationMatches(variations, key);
        if (depMatch) {
          row.deps[depMatch.file] = depMatch.file;
          delete row.deps[key];
        }
      });

      row.source = replaceRequiresOnSource(row.source, row);

      row.sha = shasum(row.source);

      pushBundleManifest(row);

      this.push(row);
      depsStream.write(row);
      next();
    });
    b.pipeline.get('deps').push(mendelify);

    // bundle
    var bundler = b.bundle();
    bundler.on('end', function(){
      depsStream.end();
      doneVariation();
    });
    bundler.pipe(bundleStream);
  }, function() {
    var manifestPath = path.join(process.cwd(), config.dest, rawBundle.id+'.manifest.json');
    fs.writeFile(manifestPath, JSON.stringify(bundleManifest, null, 2), function (err) {
      if (err) throw err;
      /*
        Here is the right place to implement the generation of extracted bundles. Simple algorithm
        should be as follows:
          1. Assuming all `bundle.externals` are already parsed with something similar to `variationMatches`.
          2. Assuming `bundleManifest` ids are already parsed with `variationMatches` during "deps" phase.
          3. Create one array with all `bundle.externals` + all `bundleManifest` ids
          4. Use this array as externals for all the `bundle.externals` bundles
          5. Run mendel through all those bundles
        The reason I prefer not to do this righ now is because we are doing procedural async bundle generation
        and we need to make mendel a plugin. This way we can have the plugin trigger extra bundle generations
        by adding the above algorithm on the wrap phase.
      */
      doneBundle();
    });
  });
});

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}

function replaceRequiresOnSource (src) {
  var opts = {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true
  };
  return falafel(src, opts, function (node) {
    if (isRequire(node)) {
      var value = node.arguments[0].value;
      var match = variationMatches(variations, value);
      if (match) {
        if(match) node.update('require(\'' + match.file + '\')');
      }
    }
  }).toString();
}

function isRequire (node) {
  var c = node.callee;
  return c
    && node.type === 'CallExpression'
    && c.type === 'Identifier'
    && c.name === 'require'
    && node.arguments[0]
    && node.arguments[0].type === 'Literal'
  ;
}


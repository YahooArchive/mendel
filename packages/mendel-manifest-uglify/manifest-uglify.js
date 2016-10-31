/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var UglifyJS = require("uglify-js");
var debug = require("debug")('mendel-manifest-uglify');

module.exports = manifestUglify;

function manifestUglify(manifests, options, next) {
    var optBundles = [].concat(options.bundles).filter(Boolean);
    // `compress` and `mangle` are set to `true` on uglifyify
    // just making sure we have the same defaults
    var uglifyOptions = Object.assign({
        compress: true,
        mangle: true,
    }, options.uglifyOptions, {
        fromString: true
    });

    function whichManifests(manifest) {
        // default to all bundles
        if (optBundles.length === 0) {
            return true;
        }
        return optBundles.indexOf(manifest) >= 0;
    }

    Object.keys(manifests).filter(whichManifests).forEach(function(name) {
        var manifest = manifests[name];
        manifest.bundles.forEach(function(module) {
            module.data.forEach(function(variation) {
                var result = UglifyJS.minify(
                    variation.source,
                    Object.assign({}, uglifyOptions, {
                        file: variation.file,
                        root: options.mendelConfig.basedir,
                        sourceMaps: false, // TODO: sourcemaps support
                    })
                );

                debug([ variation.id.replace(/^.*node_modules\//, ''),
                        variation.source.length, '->', result.code.length,
                        'bytes' ].join(' '));

                variation.source = result.code;
            });
        });
    });

    next(manifests);
}
